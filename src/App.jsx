import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './App.css'
import Notification from './components/Notification'
import Exam from './pages/Exam'

// API and Cognito config
const API_BASE = 'https://hrj5qc8u76.execute-api.ap-southeast-1.amazonaws.com/prod'
const COGNITO_DOMAIN = 'https://ap-southeast-1dmwikmffs.auth.ap-southeast-1.amazoncognito.com'
const CLIENT_ID = '4033t9pc3hhe7r84eq8mi2cnkj'
const SCOPE = 'email+openid+phone+profile'
const REDIRECT_URI = `${window.location.origin}/callback`

function CallbackHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    let didCancel = false

    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code && !didCancel) {
      // Exchange code for tokens and get user info
      exchangeCodeForTokens(code)
    }

    return () => {
      didCancel = true
    }
  }, [navigate])

  const exchangeCodeForTokens = async (code) => {
    try {
      console.log('Exchanging code for tokens...')
      console.log('Code:', code)
      console.log('URL:', `${API_BASE}/token?code=${code}`)

      const response = await fetch(`${API_BASE}/token?code=${code}`)
      console.log('Response status:', response.status)

      const data = await response.json()
      console.log('Response data:', data)

      // Handle both Lambda Proxy (direct response) and non-proxy (wrapped in body)
      const body = data.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data
      console.log('Parsed body:', body)

      if (body.access_token) {
        console.log('Got access token, storing...')
        // Store the tokens
        const user = {
          access_token: body.access_token,
          id_token: body.id_token,
          refresh_token: body.refresh_token,
          code: code
        }
        localStorage.setItem('user', JSON.stringify(user))
        navigate('/dashboard', { replace: true })
      } else {
        console.error('No access token received')
        console.error('Body:', body)
        navigate('/', { replace: true })
      }
    } catch (err) {
      console.error('Token exchange failed:', err)
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Đang xử lý đăng nhập...</p>
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchingUserInfo, setFetchingUserInfo] = useState(true)
  const [userInfo, setUserInfo] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [creatingExam, setCreatingExam] = useState(false)
  const fetchingRef = useRef(false)
  const hasFetchedRef = useRef(false)
  const profileMenuRef = useRef(null)
  const fileInputRef = useRef(null)

  const fetchUserInfo = useCallback(async (accessToken) => {
    // Prevent duplicate fetches
    if (fetchingRef.current || hasFetchedRef.current) {
      console.log('Skipping duplicate fetch request')
      return
    }

    fetchingRef.current = true
    setFetchingUserInfo(true)

    try {
      console.log('Fetching user info...')
      const response = await fetch(`${API_BASE}/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      console.log('User info response status:', response.status)

      const data = await response.json()
      console.log('User info data:', data)

      // Handle both Lambda Proxy (direct response) and non-proxy (wrapped in body)
      const body = data.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data
      console.log('User info parsed:', body)
      console.log('User groups:', body.groups)
      console.log('Is admin?', body.groups?.includes('admin'))

      setUserInfo(body)
      // Save user info to localStorage for future sessions
      localStorage.setItem('userInfo', JSON.stringify(body))
      hasFetchedRef.current = true
    } catch (err) {
      console.error('Failed to fetch user info:', err)
    } finally {
      fetchingRef.current = false
      setFetchingUserInfo(false)
    }
  }, [])

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const savedUserInfo = localStorage.getItem('userInfo')

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)

      // Check if we have cached user info
      if (savedUserInfo) {
        // Use cached user info
        const parsedUserInfo = JSON.parse(savedUserInfo)
        setUserInfo(parsedUserInfo)
        setFetchingUserInfo(false)
        hasFetchedRef.current = true
        console.log('Using cached user info')
      } else if (parsedUser.access_token) {
        // Fetch user info from API only if not cached
        fetchUserInfo(parsedUser.access_token)
      }
    }
    setLoading(false)
  }, [fetchUserInfo])

  // Handle click outside to close profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu])

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('userInfo')
    const logoutUrl = `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(window.location.origin)}`
    window.location.href = logoutUrl
  }

  const getInitials = (name) => {
    if (!name) return '👤'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      setUploadStatus({ type: 'error', message: 'Please select a PDF file' })
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'File size must be less than 10MB' })
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadStatus(null)

    try {
      // Stage 1: Validation (0-10%)
      console.log('Validating file...')
      setUploadProgress(10)

      // Stage 2: Base64 conversion (10-30%)
      console.log('Converting PDF to base64...')
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64String = reader.result.split(',')[1]
          resolve(base64String)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      setUploadProgress(30)

      // Stage 3: Uploading to server (30-70%)
      console.log('Uploading PDF to API...')

      // Use XMLHttpRequest for progress tracking
      const uploadPromise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = 30 + (e.loaded / e.total) * 40
            setUploadProgress(Math.round(percentComplete))
          }
        })

        xhr.addEventListener('load', () => {
          // Stage 4: Processing on server (70-100%)
          setUploadProgress(70)
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve({ ok: true, status: xhr.status, data })
            } catch (e) {
              reject(new Error('Invalid response format'))
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve({ ok: false, status: xhr.status, data })
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'))
        })

        xhr.open('POST', `${API_BASE}/upload`)
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.setRequestHeader('Authorization', `Bearer ${user.access_token}`)
        xhr.send(JSON.stringify({ file: base64 }))
      })

      const response = await uploadPromise

      console.log('Upload response status:', response.status)
      console.log('Upload response data:', response.data)

      if (response.ok) {
        // Complete processing stage (70-100%)
        setUploadProgress(100)

        setUploadStatus({
          type: 'success',
          message: `Successfully uploaded! ${response.data.questions || 0} questions extracted.`
        })
      } else {
        setUploadStatus({
          type: 'error',
          message: response.data.message || 'Upload failed. Please try again.'
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({
        type: 'error',
        message: error.message || 'Failed to upload file. Please check your connection and try again.'
      })
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleCreateExam = async () => {
    setCreatingExam(true)

    try {
      console.log('Fetching exam questions from /exam endpoint...')

      const response = await fetch(`${API_BASE}/exam`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Raw response data:', data)

      // Handle both Lambda Proxy (direct response) and non-proxy (wrapped in body)
      const body = data.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data

      console.log('===== EXAM QUESTIONS =====')
      console.log('Quiz ID:', body.quiz_id)
      console.log('Structure:', body.structure)
      console.log('Fill Short Groups:', body.groups.fill_short)
      console.log('Fill Long Groups:', body.groups.fill_long)
      console.log('Reading Groups:', body.groups.reading)
      console.log('Reorder Questions:', body.reorder_questions)
      console.log('===========================')

      // Navigate to exam page
      navigate('/exam')

    } catch (error) {
      console.error('Error fetching exam:', error)
      setUploadStatus({
        type: 'error',
        message: error.message || 'Failed to create exam. Please try again.'
      })
    } finally {
      setCreatingExam(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Đang tải...</p>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/" replace />
  }
  
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="logo">📚 THPT English Prep</div>
          <div className="user-menu" ref={profileMenuRef}>
            <button
              className="user-profile-button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="user-avatar">
                {userInfo?.picture ? (
                  <img src={userInfo.picture} alt={userInfo.username || 'User'} className="user-avatar-img" />
                ) : (
                  <span className="user-avatar-initials">
                    {getInitials(userInfo?.username || userInfo?.name || userInfo?.email)}
                  </span>
                )}
              </div>
              <span className="user-name">{userInfo?.username || userInfo?.name || userInfo?.email?.split('@')[0] || 'User'}</span>
              <svg className={`dropdown-arrow ${showProfileMenu ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-avatar">
                    {userInfo?.picture ? (
                      <img src={userInfo.picture} alt={userInfo.username || 'User'} className="profile-dropdown-avatar-img" />
                    ) : (
                      <span className="profile-dropdown-avatar-initials">
                        {getInitials(userInfo?.username || userInfo?.name || userInfo?.email)}
                      </span>
                    )}
                  </div>
                  <div className="profile-dropdown-info">
                    <h3 className="profile-dropdown-name">{userInfo?.username || userInfo?.name || 'User'}</h3>
                    <p className="profile-dropdown-email">{userInfo?.email || 'No email'}</p>
                  </div>
                </div>

                <div className="profile-dropdown-divider"></div>

                <div className="profile-dropdown-details">
                  <div className="profile-detail-item">
                    <span className="profile-detail-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      Email
                    </span>
                    <span className="profile-detail-value">{userInfo?.email || 'N/A'}</span>
                  </div>
                  {userInfo?.phone_number && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        Phone
                      </span>
                      <span className="profile-detail-value">{userInfo.phone_number}</span>
                    </div>
                  )}
                  {userInfo?.sub && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        User ID
                      </span>
                      <span className="profile-detail-value profile-detail-truncate">{userInfo.sub}</span>
                    </div>
                  )}
                  {userInfo?.groups && userInfo.groups.length > 0 && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Groups
                      </span>
                      <span className="profile-detail-value">
                        {userInfo.groups.map(group => (
                          <span key={group} className="profile-badge">{group}</span>
                        ))}
                      </span>
                    </div>
                  )}
                  {userInfo?.email_verified !== undefined && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Email Verified
                      </span>
                      <span className="profile-detail-value">{userInfo.email_verified ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>

                <div className="profile-dropdown-divider"></div>

                <div className="profile-dropdown-actions">
                  <button onClick={handleLogout} className="btn-logout-dropdown">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="dashboard-main">
        <div className="container">
          <div className="dashboard-welcome">
            <h1 className="dashboard-title">Chào mừng trở lại, <span className="highlight-name">{userInfo?.username || userInfo?.email?.split('@')[0] || 'bạn'}</span>! 👋</h1>
            <p className="dashboard-subtitle">Hãy tiếp tục hành trình chinh phục Tiếng Anh THPT của bạn</p>
          </div>

          {/* Actions */}
          <div className="actions-container">
            <div className="action-card-modern">
              <div className="action-card-content">
                <div className="action-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </div>
                <div className="action-card-text">
                  <h3 className="action-card-title">Create Exam</h3>
                  <p className="action-card-description">Start creating a new exam for your students</p>
                </div>
              </div>
              <button
                className="btn-action-modern"
                onClick={handleCreateExam}
                disabled={creatingExam}
              >
                {creatingExam ? (
                  <>
                    <svg className="upload-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Get Started</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Upload PDF - Admin only */}
            {userInfo?.groups?.includes('admin') && (
              <div className="action-card-modern">
                <div className="action-card-content">
                  <div className="action-card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <div className="action-card-text">
                    <h3 className="action-card-title">Upload PDF</h3>
                    <p className="action-card-description">Upload exam materials and resources</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                {uploading && (
                  <div className="upload-progress-container">
                    <div className="upload-progress-bar">
                      <div
                        className="upload-progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="upload-progress-text">
                      <span>Uploading...</span>
                      <span className="upload-progress-percent">{uploadProgress}%</span>
                    </div>
                  </div>
                )}
                <button
                  className="btn-action-modern"
                  onClick={handleUploadClick}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <svg className="upload-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Upload</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Loading overlay when fetching user info */}
      {fetchingUserInfo && (
        <div className="loading-overlay">
          <div className="loading-overlay-content">
            <div className="spinner"></div>
            <p>Loading user information...</p>
          </div>
        </div>
      )}

      {/* Notification popup */}
      {uploadStatus && (
        <Notification
          type={uploadStatus.type}
          message={uploadStatus.message}
          duration={5000}
          onClose={() => setUploadStatus(null)}
          position="top-right"
        />
      )}
    </div>
  )
}

function Landing() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])
  
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Đang tải...</p>
      </div>
    )
  }
  
  // If logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  
  const handleLogin = async () => {
    try {
      const originParam = encodeURIComponent(window.location.origin)
      const timestamp = Date.now() // Cache buster
      console.log('Logging in from:', window.location.origin)
      console.log('Request URL:', `${API_BASE}/auth?origin=${originParam}&t=${timestamp}`)
      
      // Send origin as query parameter (API Gateway supports GET)
      const response = await fetch(`${API_BASE}/auth?origin=${originParam}&t=${timestamp}`)
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body
      console.log('Parsed body:', body)
      
      if (body.loginUrl) {
        console.log('Redirecting to:', body.loginUrl)
        window.location.href = body.loginUrl
      } else {
        console.error('No loginUrl in response')
      }
    } catch (err) {
      console.error('Login error:', err)
    }
  }
  
  const handleSignup = () => {
    const signupUrl = `${COGNITO_DOMAIN}/signup?client_id=${CLIENT_ID}&response_type=code&scope=${SCOPE}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
    window.location.href = signupUrl
  }

  return (
    <div className="landing">
      <div className="bg-animation">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <header className="hero">
        <div className="container">
          <nav className="navbar">
            <div className="logo">📚 THPT English Prep</div>
            <div className="nav-buttons">
              <button onClick={handleLogin} className="btn-text">Đăng nhập</button>
              <button onClick={handleSignup} className="btn-primary">Đăng ký ngay</button>
            </div>
          </nav>

          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">Chinh phục <span className="highlight">Tiếng Anh THPT</span></h1>
              <p className="hero-description">Luyện thi theo đúng cấu trúc đề thi THPT Quốc Gia. Chấm điểm tự động bằng AI, phân tích chi tiết từng câu hỏi.</p>
              <div className="hero-actions">
                <button onClick={handleSignup} className="btn-hero-primary">Bắt đầu học ngay →</button>
                <button onClick={handleLogin} className="btn-hero-secondary">Đăng nhập</button>
              </div>
            </div>
            <div className="hero-features">
              <div className="floating-feature-card feature-card-1">
                <div className="feature-card-glow"></div>
                <div className="feature-card-icon">📝</div>
                <div className="feature-card-content">
                  <h4>Đề thi thực tế</h4>
                  <p>1,000+ đề thi THPT</p>
                </div>
                <div className="feature-card-badge">NEW</div>
              </div>
              <div className="floating-feature-card feature-card-2">
                <div className="feature-card-glow"></div>
                <div className="feature-card-icon">🤖</div>
                <div className="feature-card-content">
                  <h4>Chấm điểm AI</h4>
                  <p>Chính xác 99.5%</p>
                </div>
                <div className="feature-progress">
                  <div className="feature-progress-bar"></div>
                </div>
              </div>
              <div className="floating-feature-card feature-card-3">
                <div className="feature-card-glow"></div>
                <div className="feature-card-icon">👨‍🏫</div>
                <div className="feature-card-content">
                  <h4>Chatbot Giảng viên</h4>
                  <p>Hỗ trợ 24/7</p>
                </div>
              </div>
              <div className="floating-feature-card feature-card-4">
                <div className="feature-card-glow"></div>
                <div className="feature-card-icon">📊</div>
                <div className="feature-card-content">
                  <h4>Phân tích chi tiết</h4>
                  <p>Báo cáo thông minh</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-left">
              <div className="footer-logo">📚 THPT English Prep</div>
              <p>Nền tảng luyện thi Tiếng Anh THPT với công nghệ AI</p>
            </div>
            <div className="footer-right">
              © 2025 THPT English Prep
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/callback" element={<CallbackHandler />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/exam" element={<Exam />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

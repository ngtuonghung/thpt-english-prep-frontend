import { useState, useEffect, useRef } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import './Exam.css'
import ConfirmModal from '../components/ConfirmModal'
import TopBar from '../components/TopBar'

const API_BASE = 'https://hrj5qc8u76.execute-api.ap-southeast-1.amazonaws.com/prod'
const EXAM_DURATION = 50 * 60 // 50 minutes in seconds

function Exam() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [examData, setExamData] = useState(null)
  const [error, setError] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [answers, setAnswers] = useState({}) // Store user's answers
  const [timeRemaining, setTimeRemaining] = useState(EXAM_DURATION)
  const [examStarted, setExamStarted] = useState(false)
  const [examStartTime, setExamStartTime] = useState(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const savedUserInfo = localStorage.getItem('userInfo')

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)

      if (savedUserInfo) {
        setUserInfo(JSON.parse(savedUserInfo))
      }

      fetchExamData(parsedUser.access_token)
    } else {
      setLoading(false)
    }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (!examStarted || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          // Auto-submit when time runs out
          navigate('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [examStarted, timeRemaining, navigate])

  const fetchExamData = async (accessToken) => {
    try {
      const response = await fetch(`${API_BASE}/exam`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const body = data.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data

      setExamData(body)
      setExamStartTime(new Date())
      setExamStarted(true)
    } catch (err) {
      console.error('Error fetching exam:', err)
      setError(err.message || 'Failed to load exam data')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => {
      // If clicking the same answer, unselect it
      if (prev[questionId] === answer) {
        const newAnswers = { ...prev }
        delete newAnswers[questionId]
        return newAnswers
      }
      // Otherwise, select the new answer
      return {
        ...prev,
        [questionId]: answer
      }
    })
  }

  const handleSubmitClick = () => {
    setShowSubmitModal(true)
  }

  const handleConfirmSubmit = () => {
    // Just navigate back to dashboard for now
    navigate('/dashboard')
  }

  const handleExitClick = () => {
    setShowExitModal(true)
  }

  const handleConfirmExit = () => {
    navigate('/dashboard')
  }

  const formatDateTime = (date) => {
    if (!date) return ''
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${hours}:${minutes} - ${day}/${month}/${year}`
  }

  const scrollToQuestion = (questionNum) => {
    const element = document.getElementById(`question-${questionNum}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Build flat list of all questions for table of contents
  const getAllQuestions = () => {
    if (!examData) return []

    const questions = []
    let questionNum = 1

    // Reorder questions
    if (examData.reorder_questions) {
      examData.reorder_questions.forEach(q => {
        questions.push({
          num: questionNum++,
          id: `reorder-${q.id}`,
          type: 'reorder'
        })
      })
    }

    // Fill short groups
    if (examData.groups.fill_short) {
      examData.groups.fill_short.forEach(group => {
        group.subquestions.forEach((_, subIdx) => {
          questions.push({
            num: questionNum++,
            id: `fill-short-${group.id}-${subIdx}`,
            type: 'fill_short'
          })
        })
      })
    }

    // Fill long groups
    if (examData.groups.fill_long) {
      examData.groups.fill_long.forEach(group => {
        group.subquestions.forEach((_, subIdx) => {
          questions.push({
            num: questionNum++,
            id: `fill-long-${group.id}-${subIdx}`,
            type: 'fill_long'
          })
        })
      })
    }

    // Reading groups
    if (examData.groups.reading) {
      examData.groups.reading.forEach(group => {
        group.subquestions.forEach((_, subIdx) => {
          questions.push({
            num: questionNum++,
            id: `reading-${group.id}-${subIdx}`,
            type: 'reading'
          })
        })
      })
    }

    return questions
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Đang tải đề thi...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  const allQuestions = getAllQuestions()

  return (
    <div className="exam-page">
      <TopBar userInfo={userInfo} />

      <main className="exam-main">
        {error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Không thể tải đề thi</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/dashboard')} className="btn-back">
              Quay lại Dashboard
            </button>
          </div>
        ) : examData ? (
          <div className="exam-container">
            {/* Sidebar */}
            <aside className="exam-sidebar">
              <div className="sidebar-content">
                {/* Quiz Info */}
                <div className="sidebar-section">
                  <h3 className="sidebar-title">Thông tin đề thi</h3>
                  <div className="quiz-info">
                    <div className="quiz-info-item">
                      <span className="quiz-label">Mã đề:</span>
                      <span className="quiz-value">{examData.quiz_id}</span>
                    </div>
                    <div className="quiz-info-item">
                      <span className="quiz-label">Tổng câu hỏi:</span>
                      <span className="quiz-value">{examData.structure.total_questions}</span>
                    </div>
                    <div className="quiz-info-item">
                      <span className="quiz-label">Bắt đầu lúc:</span>
                      <span className="quiz-value">{formatDateTime(examStartTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Table of Contents */}
                <div className="sidebar-section">
                  <h3 className="sidebar-title">Danh sách câu hỏi</h3>
                  <div className="question-grid">
                    {allQuestions.map(q => (
                      <button
                        key={q.id}
                        onClick={() => scrollToQuestion(q.num)}
                        className={`question-btn ${answers[q.id] ? 'answered' : ''}`}
                      >
                        {q.num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer */}
                <div className="sidebar-section">
                  <div className={`timer ${timeRemaining < 300 ? 'timer-warning' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span className="timer-text">{formatTime(timeRemaining)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button onClick={handleSubmitClick} className="btn-submit">
                  Nộp bài
                </button>
              </div>
            </aside>

            {/* Questions Content */}
            <div className="exam-content">
              {/* Reorder Questions */}
              {examData.reorder_questions && examData.reorder_questions.length > 0 && (
                <div className="question-section">
                  <h2 className="section-title">
                    <span className="section-number">Phần 1</span>
                    Câu hỏi sắp xếp
                  </h2>
                  {examData.reorder_questions.map((question, idx) => {
                    const questionId = `reorder-${question.id}`
                    const questionNum = idx + 1
                    return (
                      <div key={question.id} id={`question-${questionNum}`} className="question-card">
                        <div className="question-header">
                          <span className="question-number">Câu {questionNum}</span>
                        </div>
                        <p className="question-text">{question.content}</p>
                        <div className="options-list">
                          {question.options.map((option, optIdx) => {
                            const optionLetter = String.fromCharCode(65 + optIdx)
                            return (
                              <div
                                key={optIdx}
                                onClick={() => handleAnswerSelect(questionId, optionLetter)}
                                className={`option-item ${answers[questionId] === optionLetter ? 'selected' : ''}`}
                              >
                                <span className="option-label">{optionLetter}.</span>
                                <span className="option-text">{option}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Fill Short Groups */}
              {examData.groups.fill_short && examData.groups.fill_short.length > 0 && (
                <div className="question-section">
                  <h2 className="section-title">
                    <span className="section-number">Phần 2</span>
                    Fill Short
                  </h2>
                  {examData.groups.fill_short.map((group, groupIdx) => {
                    let questionNum = examData.reorder_questions ? examData.reorder_questions.length : 0

                    // Calculate question number offset
                    for (let i = 0; i < groupIdx; i++) {
                      questionNum += examData.groups.fill_short[i].subquestions.length
                    }

                    return (
                      <div key={group.id} className="question-group">
                        <div className="group-context">
                          <p className="context-text">{group.context}</p>
                        </div>
                        {group.subquestions.map((subq, subIdx) => {
                          const currentQuestionNum = questionNum + subIdx + 1
                          const questionId = `fill-short-${group.id}-${subIdx}`
                          return (
                            <div key={subIdx} id={`question-${currentQuestionNum}`} className="sub-question">
                              <div className="question-header">
                                <span className="question-number">Câu {currentQuestionNum}</span>
                              </div>
                              <div className="options-list">
                                {subq.options.map((option, optIdx) => {
                                  const optionLetter = String.fromCharCode(65 + optIdx)
                                  return (
                                    <div
                                      key={optIdx}
                                      onClick={() => handleAnswerSelect(questionId, optionLetter)}
                                      className={`option-item ${answers[questionId] === optionLetter ? 'selected' : ''}`}
                                    >
                                      <span className="option-label">{optionLetter}.</span>
                                      <span className="option-text">{option}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Fill Long Groups */}
              {examData.groups.fill_long && examData.groups.fill_long.length > 0 && (
                <div className="question-section">
                  <h2 className="section-title">
                    <span className="section-number">Phần 3</span>
                    Fill Long
                  </h2>
                  {examData.groups.fill_long.map((group, groupIdx) => {
                    let questionNum = examData.reorder_questions ? examData.reorder_questions.length : 0

                    // Add fill_short questions
                    if (examData.groups.fill_short) {
                      examData.groups.fill_short.forEach(g => {
                        questionNum += g.subquestions.length
                      })
                    }

                    // Calculate question number offset for fill_long
                    for (let i = 0; i < groupIdx; i++) {
                      questionNum += examData.groups.fill_long[i].subquestions.length
                    }

                    return (
                      <div key={group.id} className="question-group">
                        <div className="group-context">
                          <p className="context-text">{group.context}</p>
                        </div>
                        {group.subquestions.map((subq, subIdx) => {
                          const currentQuestionNum = questionNum + subIdx + 1
                          const questionId = `fill-long-${group.id}-${subIdx}`
                          return (
                            <div key={subIdx} id={`question-${currentQuestionNum}`} className="sub-question">
                              <div className="question-header">
                                <span className="question-number">Câu {currentQuestionNum}</span>
                              </div>
                              <div className="options-list">
                                {subq.options.map((option, optIdx) => {
                                  const optionLetter = String.fromCharCode(65 + optIdx)
                                  return (
                                    <div
                                      key={optIdx}
                                      onClick={() => handleAnswerSelect(questionId, optionLetter)}
                                      className={`option-item ${answers[questionId] === optionLetter ? 'selected' : ''}`}
                                    >
                                      <span className="option-label">{optionLetter}.</span>
                                      <span className="option-text">{option}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Reading Groups */}
              {examData.groups.reading && examData.groups.reading.length > 0 && (
                <div className="question-section">
                  <h2 className="section-title">
                    <span className="section-number">Phần 4</span>
                    Reading Comprehension
                  </h2>
                  {examData.groups.reading.map((group, groupIdx) => {
                    let questionNum = examData.reorder_questions ? examData.reorder_questions.length : 0

                    // Add fill_short questions
                    if (examData.groups.fill_short) {
                      examData.groups.fill_short.forEach(g => {
                        questionNum += g.subquestions.length
                      })
                    }

                    // Add fill_long questions
                    if (examData.groups.fill_long) {
                      examData.groups.fill_long.forEach(g => {
                        questionNum += g.subquestions.length
                      })
                    }

                    // Calculate question number offset for reading
                    for (let i = 0; i < groupIdx; i++) {
                      questionNum += examData.groups.reading[i].subquestions.length
                    }

                    return (
                      <div key={group.id} className="question-group">
                        <div className="group-context reading-context">
                          <p className="context-text">{group.context}</p>
                        </div>
                        {group.subquestions.map((subq, subIdx) => {
                          const currentQuestionNum = questionNum + subIdx + 1
                          const questionId = `reading-${group.id}-${subIdx}`
                          return (
                            <div key={subIdx} id={`question-${currentQuestionNum}`} className="sub-question">
                              <div className="question-header">
                                <span className="question-number">Câu {currentQuestionNum}</span>
                              </div>
                              {subq.content && (
                                <p className="question-text">{subq.content}</p>
                              )}
                              <div className="options-list">
                                {subq.options.map((option, optIdx) => {
                                  const optionLetter = String.fromCharCode(65 + optIdx)
                                  return (
                                    <div
                                      key={optIdx}
                                      onClick={() => handleAnswerSelect(questionId, optionLetter)}
                                      className={`option-item ${answers[questionId] === optionLetter ? 'selected' : ''}`}
                                    >
                                      <span className="option-label">{optionLetter}.</span>
                                      <span className="option-text">{option}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Nộp bài thi"
        message="Bạn có chắc chắn muốn nộp bài thi không? Bạn sẽ không thể thay đổi câu trả lời sau khi nộp bài."
        confirmText="Nộp bài"
        cancelText="Hủy"
        confirmStyle="primary"
      />

      <ConfirmModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={handleConfirmExit}
        title="Thoát khỏi bài thi"
        message="Bạn có chắc chắn muốn thoát khỏi bài thi không? Tất cả câu trả lời của bạn sẽ không được lưu."
        confirmText="Thoát"
        cancelText="Ở lại"
        confirmStyle="danger"
      />
    </div>
  )
}

export default Exam

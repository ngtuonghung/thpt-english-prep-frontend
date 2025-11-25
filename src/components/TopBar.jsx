import { useNavigate } from 'react-router-dom'
import UserMenu from './UserMenu'
import './TopBar.css'

export default function TopBar({ userInfo, hideLogout = false }) {
  const navigate = useNavigate()

  return (
    <header className="dashboard-header">
      <div className="container">
        <div className="logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          📚 THPT English Prep
        </div>
        <UserMenu userInfo={userInfo} hideLogout={hideLogout} />
      </div>
    </header>
  )
}

import UserMenu from './UserMenu'
import './TopBar.css'

export default function TopBar({ userInfo, hideLogout = false }) {
  return (
    <header className="dashboard-header">
      <div className="container">
        <div className="logo">📚 THPT English Prep</div>
        <UserMenu userInfo={userInfo} hideLogout={hideLogout} />
      </div>
    </header>
  )
}

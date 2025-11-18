import UserMenu from './UserMenu'
import './TopBar.css'

export default function TopBar({ userInfo }) {
  return (
    <header className="dashboard-header">
      <div className="container">
        <div className="logo">📚 THPT English Prep</div>
        <UserMenu userInfo={userInfo} />
      </div>
    </header>
  )
}

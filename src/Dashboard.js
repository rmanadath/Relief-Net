import { supabase } from './supabase'

export default function Dashboard({ user }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div>
      <h2>Welcome to ReliefNet</h2>
      <p>Email: {user.email}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}
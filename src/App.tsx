import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { GroupsPage } from '@/pages/GroupsPage'
import { HomePage } from '@/pages/HomePage'
import { LogsPage } from '@/pages/LogsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TasksPage } from '@/pages/TasksPage'
import { UsersPage } from '@/pages/UsersPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<SettingsPage />} path="/settings" />
        <Route element={<UsersPage />} path="/users" />
        <Route element={<TasksPage />} path="/tasks" />
        <Route element={<GroupsPage />} path="/groups" />
        <Route element={<LogsPage />} path="/logs" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </Layout>
  )
}

export default App

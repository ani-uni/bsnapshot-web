import { type RouteConfig, route } from '@react-router/dev/routes'

export default [
  // * matches all URLs, the ? makes it optional so it will match / as well
  route('/', './pages/HomePage.tsx'),
  route('/settings', './pages/SettingsPage.tsx'),
  route('/users', './pages/UsersPage.tsx'),
  route('/tasks', './pages/TasksPage.tsx'),
  route('/groups', './pages/GroupsPage.tsx'),
  route('/logs', './pages/LogsPage.tsx'),
  route('*?', 'catchall.tsx'),
] satisfies RouteConfig

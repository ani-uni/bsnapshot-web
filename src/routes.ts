import {
  index,
  layout,
  type RouteConfig,
  route,
} from '@react-router/dev/routes'

export default [
  layout('./app/layout.tsx', [
    index('./app/index.tsx'),
    route('/tasks', './app/tasks/index.tsx'),
    route('/groups', './app/groups/index.tsx'),
    route('/users', './app/users/index.tsx'),
    route('/settings', './app/settings/index.tsx'),
    route('/logs', './app/events/index.tsx'),
  ]),
  // * matches all URLs, the ? makes it optional so it will match / as well
  route('*?', 'catchall.tsx'),
] satisfies RouteConfig

import {
  index,
  layout,
  prefix,
  type RouteConfig,
  route,
} from '@react-router/dev/routes'

export default [
  layout('./app/layout.tsx', [
    index('./app/index.tsx'),
    route('/tasks', './app/tasks/index.tsx'),
    ...prefix('/groups', [
      layout('./app/groups/layout.tsx', [
        index('./app/groups/index.tsx'),
        route('series/:seriesId', './app/groups/series.tsx'),
        route('seasons/:seasonId', './app/groups/seasons.tsx'),
        route('episodes/:episodeId', './app/groups/episodes.tsx'),
      ]),
    ]),
    route('/users', './app/users/index.tsx'),
    route('/settings', './app/settings/index.tsx'),
    route('/logs', './app/events/index.tsx'),
  ]),
  // * matches all URLs, the ? makes it optional so it will match / as well
  route('*?', 'catchall.tsx'),
] satisfies RouteConfig

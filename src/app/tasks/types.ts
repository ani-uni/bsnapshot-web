export type PregenResponse = {
  aid: string
  bvid: string
  title: string
  pubdate: number
  upMid: string
  pages: {
    cid: string
    page: number
    part: string
    duration: number
  }[]
}

export type PageEdit = {
  cid: string
  page: number
  part: string
  duration: number
  clips: Array<[number, number, number, string?]>
}

export type PregenEdit = {
  aid: string
  bvid: string
  title: string
  pubdate: number
  upMid: string
  pages: PageEdit[]
}

export type SeasonEpisodeItem = {
  id: string
  title: string | null
  sn: number | null
}

export type EpisodeTreeSection = {
  season: { id: string; title: string | null } | null
  episodes: SeasonEpisodeItem[]
}

export type CaptureItem = {
  cid: string
  pub: string | null
  upMid: string | null
  upLatest: string | null
  aid: string | null
  videoSourceState: number | null
}

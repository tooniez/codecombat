import {
  getLeaderboard, getMyRank, getLeaderboardPlayerCount,
  getCodePointsLeaderboard, getCodePointsRankForUser,
  getCodePointsPlayerCount
} from '../../api/leaderboard'
import { fetchMySessions } from '../../api/level-sessions'
import { activeArenas, activeAndPastArenas } from '../../utils'
import { getUsableArenas } from '../../api/arenas'
import _ from 'lodash'

export const currentRegularArena = _.last(_.filter(activeArenas(), a => a.type === 'regular' || a.noRegular))
export const currentChampionshipArena = _.last(_.filter(activeArenas(), a => a.type === 'championship'))
export const findArena = (season, type) => activeAndPastArenas().find(a => a.season === season && a.type === type)

/**
 * We want to be able to fetch and store rankings for
 * various levels. I.e.
 * https://codecombat.com/db/level/5fad3d71bb7075d1dd20a1c0/rankings?order=-1&scoreOffset=1000000&limit=20&team=humans&_=1607469435140
 */
export default {
  namespaced: true,
  state: {
    currentRegularArena,
    currentChampionshipArena,
    currentRegularArenaOriginal: currentRegularArena ? currentRegularArena.levelOriginal : null,
    currentChampionshipArenaOriginal: currentChampionshipArena ? currentChampionshipArena.levelOriginal : null,
    loading: false,
    mySession: {},
    myChampionshipSession: {},
    // level: {}, //Maybe level data is required?
    globalRankings: {
      globalTop: [],
      playersAbove: [],
      playersBelow: [],
      globalLeaderboardPlayerCount: 0
    },
    championshipGlobalRankings: {
      globalTop: [],
      playersAbove: [],
      playersBelow: [],
      globalLeaderboardPlayerCount: 0
    },
    championshipRankingsForLeague: {},
    // key is clan id. Returns objects with same structure.
    rankingsForLeague: {},
    codePointsRankingsForLeague: {},
    usableArenas: []
  },

  mutations: {
    setLoading (state, loading) {
      state.loading = loading
    },

    paginateArenas (state, direction = 'next') {
      const season = state.currentRegularArena.season
      const increment = direction === 'next' ? 1 : -1

      const nextOrPreviousRegularArena = findArena(season + increment, 'regular')
      const nextOrPreviousChampionshipArena = findArena(season + increment, 'championship')

      Vue.set(state, 'currentRegularArena', nextOrPreviousRegularArena)
      Vue.set(state, 'currentChampionshipArena', nextOrPreviousChampionshipArena)
      Vue.set(state, 'currentRegularArenaOriginal', nextOrPreviousRegularArena ? nextOrPreviousRegularArena.levelOriginal : null)
      Vue.set(state, 'currentChampionshipArenaOriginal', nextOrPreviousChampionshipArena ? nextOrPreviousChampionshipArena.levelOriginal : null)
    },

    setGlobalRanking (state, rankingsList) {
      Vue.set(state.globalRankings, 'globalTop', rankingsList)
    },

    setGlobalAbove (state, above) {
      Vue.set(state.globalRankings, 'playersAbove', above)
    },

    setGlobalBelow (state, below) {
      Vue.set(state.globalRankings, 'playersBelow', below)
    },

    setGlobalLeaderboardPlayerCount (state, count) {
      Vue.set(state.globalRankings, 'globalLeaderboardPlayerCount', count)
    },

    setChampionshipGlobalRanking (state, rankingsList) {
      Vue.set(state.championshipGlobalRankings, 'globalTop', rankingsList)
    },

    setChampionshipGlobalAbove (state, above) {
      Vue.set(state.championshipGlobalRankings, 'playersAbove', above)
    },

    setChampionshipGlobalBelow (state, below) {
      Vue.set(state.championshipGlobalRankings, 'playersBelow', below)
    },

    setChampionshipGlobalLeaderboardPlayerCount (state, count) {
      Vue.set(state.championshipGlobalRankings, 'globalLeaderboardPlayerCount', count)
    },

    setMySession (state, mySession) {
      state.mySession = mySession
    },

    clearMySession (state) {
      state.mySession = {}
    },

    setMyChampionshipSession (state, mySession) {
      state.myChampionshipSession = mySession
    },

    clearMyChampionshipSession (state) {
      state.myChampionshipSession = {}
    },

    setLeagueRanking (state, { leagueId, ranking }) {
      Vue.set(state.rankingsForLeague, leagueId, ranking)
    },

    setChampionshipLeagueRanking (state, { leagueId, ranking }) {
      Vue.set(state.championshipRankingsForLeague, leagueId, ranking)
    },

    setCodePointsRanking (state, { leagueId, ranking }) {
      Vue.set(state.codePointsRankingsForLeague, leagueId, ranking)
    },

    setCodePointsPlayerCount (state, playerCount) {
      Vue.set(state.codePointsRankingsForLeague, 'playerCount', playerCount)
    },

    setMyCodePointsRank (state, myCodePointsRank) {
      state.myCodePointsRank = myCodePointsRank
    },

    setUsableArenas (state, arenas) {
      Vue.set(state, 'usableArenas', arenas)
    }
  },

  getters: {
    isLoading (state) {
      return state.loading
    },

    globalLeaderboardPlayerCount (state) {
      return state.globalRankings.globalLeaderboardPlayerCount
    },

    globalChampionshipLeaderboardPlayerCount (state) {
      return state.championshipGlobalRankings.globalLeaderboardPlayerCount
    },

    currentRegularArena (state) {
      return state.currentRegularArena
    },

    currentChampionshipArena (state) {
      return state.currentChampionshipArena
    },

    globalRankings (state) {
      if (state.mySession && state.mySession.rank > 20) {
        const splitRankings = []
        splitRankings.push(...state.globalRankings.globalTop.slice(0, 10))
        splitRankings.push({ type: 'BLANK_ROW' })
        splitRankings.push(...state.globalRankings.playersAbove)
        // This hack is due to a race condition where the server returns the player
        // in the 4 above or 4 below. Thus we prevent player seeing duplicate of their result.
        if (![...state.globalRankings.playersAbove, ...state.globalRankings.playersBelow].some(ranking => ranking.creator === me.id)) {
          splitRankings.push(state.mySession)
        }
        splitRankings.push(...state.globalRankings.playersBelow)
        return splitRankings
      }
      return state.globalRankings.globalTop
    },

    globalChampionshipRankings (state) {
      if (state.myChampionshipSession && state.myChampionshipSession.rank > 20) {
        const splitRankings = []
        splitRankings.push(...state.championshipGlobalRankings.globalTop.slice(0, 10))
        splitRankings.push({ type: 'BLANK_ROW' })
        splitRankings.push(...state.championshipGlobalRankings.playersAbove)
        // This hack is due to a race condition where the server returns the player
        // in the 4 above or 4 below. Thus we prevent player seeing duplicate of their result.
        if (![...state.championshipGlobalRankings.playersAbove, ...state.championshipGlobalRankings.playersBelow].some(ranking => ranking.creator === me.id)) {
          splitRankings.push(state.myChampionshipSession)
        }
        splitRankings.push(...state.championshipGlobalRankings.playersBelow)
        return splitRankings
      }
      return state.championshipGlobalRankings.globalTop
    },

    clanLeaderboardPlayerCount (state) {
      return (leagueId) => {
        if (!state.rankingsForLeague[leagueId]) {
          return 0
        }
        const leagueRankings = state.rankingsForLeague[leagueId]
        return leagueRankings.leaderboardPlayerCount
      }
    },

    clanChampionshipLeaderboardPlayerCount (state) {
      return (leagueId) => {
        if (!state.championshipRankingsForLeague[leagueId]) {
          return 0
        }
        const leagueRankings = state.championshipRankingsForLeague[leagueId]
        return leagueRankings.leaderboardPlayerCount
      }
    },

    clanRankings (state) {
      return (leagueId) => {
        if (!state.rankingsForLeague[leagueId]) {
          return []
        }
        const leagueRankings = state.rankingsForLeague[leagueId]
        if (state.mySession && state.mySession.rank > 20) {
          const splitRankings = []
          splitRankings.push(...leagueRankings.top.slice(0, 10))
          splitRankings.push({ type: 'BLANK_ROW' })
          splitRankings.push(...leagueRankings.playersAbove)
          // TODO: This uses `totalScore` which is possibly wrong if not global.
          splitRankings.push(state.mySession)
          splitRankings.push(...leagueRankings.playersBelow)
          return splitRankings
        }
        // TODO: This uses `totalScore` which is possibly wrong if not global.
        // As far as I can tell, if there are AI users they don't have the league Id.
        // The server may already be normalizing this from the returned rankings.
        return leagueRankings.top
      }
    },

    clanChampionshipRankings (state) {
      return (leagueId) => {
        if (!state.championshipRankingsForLeague[leagueId]) {
          return []
        }
        const leagueRankings = state.championshipRankingsForLeague[leagueId]
        if (state.myChampionshipSession && state.myChampionshipSession.rank > 20) {
          const splitRankings = []
          splitRankings.push(...leagueRankings.top.slice(0, 10))
          splitRankings.push({ type: 'BLANK_ROW' })
          splitRankings.push(...leagueRankings.playersAbove)
          // TODO: This uses `totalScore` which is possibly wrong if not global.
          splitRankings.push(state.myChampionshipSession)
          splitRankings.push(...leagueRankings.playersBelow)
          return splitRankings
        }
        // TODO: This uses `totalScore` which is possibly wrong if not global.
        // As far as I can tell, if there are AI users they don't have the league Id.
        // The server may already be normalizing this from the returned rankings.
        return leagueRankings.top
      }
    },

    codePointsRankings (state) {
      return (leagueId) => {
        if (!state.codePointsRankingsForLeague[leagueId]) {
          return []
        }
        const codePointsRankings = state.codePointsRankingsForLeague[leagueId]
        try {
          if (state.myCodePointsRank && state.myCodePointsRank.rank > 20) {
            const splitRankings = []
            splitRankings.push(...codePointsRankings.top.slice(0, 10))
            splitRankings.push({ type: 'BLANK_ROW' })
            splitRankings.push(...codePointsRankings.playersAbove)
            splitRankings.push(state.myCodePointsRank)
            splitRankings.push(...codePointsRankings.playersBelow)
            return splitRankings
          }

          if (state.myCodePointsRank && typeof state.myCodePointsRank.rank === 'number' && state.myCodePointsRank.rank <= 20) {
            // This patches in the correct name and id if you are in the top 20.
            const rankIdx = state.myCodePointsRank.rank - 1
            const top = [...codePointsRankings.top]
            top[rankIdx] = {
              ...codePointsRankings.top[rankIdx],
              creator: me.id,
              creatorName: me.broadName()
            }
            return top
          }

          return codePointsRankings.top
        } catch (e) {
          // TODO - handle correctly. This is a hack to avoid strange situations as we are going fast.
          console.error(e)
        }
        return []
      }
    },
    codePointsPlayerCount (state) {
      return state.codePointsRankingsForLeague.playerCount
    },
    usableArenas (state) {
      return state.usableArenas
    }
  },

  actions: {
    async loadGlobalRequiredData ({ commit, dispatch, state }) {
      if (!state.currentRegularArena) return
      commit('setLoading', true)
      commit('clearMySession')
      const awaitPromises = [
        dispatch('fetchGlobalLeaderboard'),
        dispatch('fetchGlobalLeaderboardPlayerCount')
      ]
      const sessionsData = await fetchMySessions(state.currentRegularArenaOriginal)

      if (Array.isArray(sessionsData) && sessionsData.length > 0) {
        const teamSession = sessionsData.find((session) => session.team === 'humans')
        if (!teamSession) {
          commit('setLoading', false)
          return
        }
        const score = teamSession.totalScore

        if (score !== undefined) {
          const [playersAbove, playersBelow, myRank] = await Promise.all([
            getLeaderboard(state.currentRegularArenaOriginal, { order: 1, scoreOffset: score, limit: 4 }),
            getLeaderboard(state.currentRegularArenaOriginal, { order: -1, scoreOffset: score, limit: 4 }),
            getMyRank(state.currentRegularArenaOriginal, teamSession._id, {
              scoreOffset: score,
              team: 'humans'
            })
          ])

          let rank = parseInt(myRank, 10)
          for (const aboveSession of playersAbove) {
            rank -= 1
            aboveSession.rank = rank
          }
          playersAbove.reverse()
          rank = parseInt(myRank, 10)
          for (const belowSession of playersBelow) {
            rank += 1
            belowSession.rank = rank
          }

          // TODO - Maybe server can fill these in, or we can query
          //        this more simply.
          teamSession.rank = parseInt(myRank, 10)
          teamSession.creatorName = me.broadName()

          commit('setMySession', teamSession)
          commit('setGlobalAbove', playersAbove)
          commit('setGlobalBelow', playersBelow)
        }
      }
      await Promise.all(awaitPromises)
      commit('setLoading', false)
    },

    async loadChampionshipGlobalRequiredData ({ commit, dispatch, state }) {
      if (!state.currentChampionshipArena) return
      commit('clearMyChampionshipSession')
      const awaitPromises = [
        dispatch('fetchChampionshipGlobalLeaderboard'),
        dispatch('fetchChampionshipGlobalLeaderboardPlayerCount')
      ]
      const sessionsData = await fetchMySessions(state.currentChampionshipArenaOriginal)

      if (Array.isArray(sessionsData) && sessionsData.length > 0) {
        const teamSession = sessionsData.find((session) => session.team === 'humans')

        if (!teamSession) {
          return
        }
        const score = teamSession.totalScore
        console.log('my score is:', score)

        if (score !== undefined) {
          const [playersAbove, playersBelow, myRank] = await Promise.all([
            getLeaderboard(state.currentChampionshipArenaOriginal, { order: 1, scoreOffset: score, limit: 4 }),
            getLeaderboard(state.currentChampionshipArenaOriginal, { order: -1, scoreOffset: score, limit: 4 }),
            getMyRank(state.currentChampionshipArenaOriginal, teamSession._id, {
              scoreOffset: score,
              team: 'humans'
            })
          ])

          let rank = parseInt(myRank, 10)
          for (const aboveSession of playersAbove) {
            rank -= 1
            aboveSession.rank = rank
          }
          playersAbove.reverse()
          rank = parseInt(myRank, 10)
          for (const belowSession of playersBelow) {
            rank += 1
            belowSession.rank = rank
          }

          // TODO - Maybe server can fill these in, or we can query
          //        this more simply.
          teamSession.rank = parseInt(myRank, 10)
          teamSession.creatorName = me.broadName()

          commit('setMyChampionshipSession', teamSession)
          commit('setChampionshipGlobalAbove', playersAbove)
          commit('setChampionshipGlobalBelow', playersBelow)
        }
      }
      await Promise.all(awaitPromises)
    },

    async loadClanRequiredData ({ commit, state }, { leagueId }) {
      if (!state.currentRegularArena) return
      const leagueRankingInfo = {
        top: [],
        playersAbove: [],
        playersBelow: []
      }
      commit('clearMySession')

      const topLeagueRankingPromise = getLeaderboard(state.currentRegularArenaOriginal, {
        order: -1,
        scoreOffset: 1000000,
        limit: 20,
        team: 'humans',
        'leagues.leagueID': leagueId
      }).then(ranking => {
        // Temporarily only choose unique sessions as duplicate AI sessions are returned.
        leagueRankingInfo.top = _.uniq(ranking, true, session => session._id)
      })

      const leagueLeaderboardPlayerCountPromise = getLeaderboardPlayerCount(state.currentRegularArenaOriginal, {
        team: 'humans',
        'leagues.leagueID': leagueId
      }).then(playerCount => {
        leagueRankingInfo.leaderboardPlayerCount = parseInt(playerCount, 10)
      })

      const awaitPromises = [
        topLeagueRankingPromise,
        leagueLeaderboardPlayerCountPromise
      ]

      const sessionsData = await fetchMySessions(state.currentRegularArenaOriginal)

      if (Array.isArray(sessionsData) && sessionsData.length > 0) {
        const teamSession = sessionsData.find((session) => session.team === 'humans')
        if (!teamSession) {
          commit('setLoading', false)
          return
        }
        const score = (((teamSession.leagues || []).find(({ leagueID }) => leagueID === leagueId) || {}).stats || {}).totalScore

        if (score !== undefined) {
          const [playersAbove, playersBelow, myRank] = await Promise.all([
            getLeaderboard(state.currentRegularArenaOriginal, { order: 1, scoreOffset: score, limit: 4, 'leagues.leagueID': leagueId }),
            getLeaderboard(state.currentRegularArenaOriginal, { order: -1, scoreOffset: score, limit: 4, 'leagues.leagueID': leagueId }),
            getMyRank(state.currentRegularArenaOriginal, teamSession._id, {
              scoreOffset: score,
              team: 'humans',
              'leagues.leagueID': leagueId
            })
          ])

          let rank = parseInt(myRank, 10)
          for (const aboveSession of playersAbove) {
            rank -= 1
            aboveSession.rank = rank
          }
          playersAbove.reverse()
          rank = parseInt(myRank, 10)
          for (const belowSession of playersBelow) {
            rank += 1
            belowSession.rank = rank
          }

          teamSession.rank = parseInt(myRank, 10)
          leagueRankingInfo.playersAbove = playersAbove
          leagueRankingInfo.playersBelow = playersBelow

          commit('setMySession', teamSession)
        }
      }

      await Promise.all(awaitPromises)

      commit('setLeagueRanking', { leagueId, ranking: leagueRankingInfo })
    },

    async loadChampionshipClanRequiredData ({ commit, state }, { leagueId }) {
      if (!state.currentChampionshipArena) return
      const leagueRankingInfo = {
        top: [],
        playersAbove: [],
        playersBelow: []
      }
      commit('clearMyChampionshipSession')

      const topLeagueRankingPromise = getLeaderboard(state.currentChampionshipArenaOriginal, {
        order: -1,
        scoreOffset: 1000000,
        limit: 20,
        team: 'humans',
        'leagues.leagueID': leagueId
      }).then(ranking => {
        // Temporarily only choose unique sessions as duplicate AI sessions are returned.
        leagueRankingInfo.top = _.uniq(ranking, true, session => session._id)
      })

      const leagueLeaderboardPlayerCountPromise = getLeaderboardPlayerCount(state.currentChampionshipArenaOriginal, {
        team: 'humans',
        'leagues.leagueID': leagueId
      }).then(playerCount => {
        leagueRankingInfo.leaderboardPlayerCount = parseInt(playerCount, 10)
      })

      const awaitPromises = [
        topLeagueRankingPromise,
        leagueLeaderboardPlayerCountPromise
      ]

      const sessionsData = await fetchMySessions(state.currentChampionshipArenaOriginal)

      if (Array.isArray(sessionsData) && sessionsData.length > 0) {
        const teamSession = sessionsData.find((session) => session.team === 'humans')
        if (!teamSession) {
          return
        }
        const score = (((teamSession.leagues || []).find(({ leagueID }) => leagueID === leagueId) || {}).stats || {}).totalScore

        if (score !== undefined) {
          const [playersAbove, playersBelow, myRank] = await Promise.all([
            getLeaderboard(state.currentChampionshipArenaOriginal, { order: 1, scoreOffset: score, limit: 4, 'leagues.leagueID': leagueId }),
            getLeaderboard(state.currentChampionshipArenaOriginal, { order: -1, scoreOffset: score, limit: 4, 'leagues.leagueID': leagueId }),
            getMyRank(state.currentChampionshipArenaOriginal, teamSession._id, {
              scoreOffset: score,
              team: 'humans',
              'leagues.leagueID': leagueId
            })
          ])

          let rank = parseInt(myRank, 10)
          for (const aboveSession of playersAbove) {
            rank -= 1
            aboveSession.rank = rank
          }
          playersAbove.reverse()
          rank = parseInt(myRank, 10)
          for (const belowSession of playersBelow) {
            rank += 1
            belowSession.rank = rank
          }

          teamSession.rank = parseInt(myRank, 10)
          leagueRankingInfo.playersAbove = playersAbove
          leagueRankingInfo.playersBelow = playersBelow

          commit('setMyChampionshipSession', teamSession)
        }
      }

      await Promise.all(awaitPromises)

      commit('setChampionshipLeagueRanking', { leagueId, ranking: leagueRankingInfo })
    },

    async loadCodePointsRequiredData ({ commit }, { leagueId }) {
      const codePointsRankingInfo = {
        top: [],
        playersAbove: [],
        playersBelow: []
      }

      const topCodePointsRankingPromise = getCodePointsLeaderboard(leagueId, {
        order: -1,
        scoreOffset: 1000000,
        limit: 20
      }).then(ranking => {
        codePointsRankingInfo.top = ranking
      })

      if (me.get('stats') && me.get('stats').codePoints) {
        const [playersAbove, playersBelow, myRank] = await Promise.all([
          getCodePointsLeaderboard(leagueId, { order: 1, scoreOffset: me.get('stats').codePoints, limit: 4 }),
          getCodePointsLeaderboard(leagueId, { order: -1, scoreOffset: me.get('stats').codePoints, limit: 4 }),
          getCodePointsRankForUser(leagueId, me.id, { scoreOffset: me.get('stats').codePoints })
        ])

        let rank = parseInt(myRank, 10)
        for (const abovePlayer of playersAbove) {
          rank -= 1
          abovePlayer.rank = rank
        }
        playersAbove.reverse()
        rank = parseInt(myRank, 10)
        for (const belowPlayer of playersBelow) {
          rank += 1
          belowPlayer.rank = rank
        }

        // Required by the leaderboard to correctly show your user and highlight the row
        const myPlayerRow = {
          creatorName: me.broadName(),
          rank: parseInt(myRank, 10),
          totalScore: me.get('stats').codePoints,
          creator: me.id,
          submittedCodeLanguage: me.get('aceConfig')?.language,
        }

        codePointsRankingInfo.playersAbove = playersAbove
        codePointsRankingInfo.playersBelow = playersBelow

        // This edge case happens when we don't know the rank of the user.
        // In this case we want to wipe all rankings so we aren't guessing random ranks.
        if (myRank === 'unknown') {
          codePointsRankingInfo.playersAbove = playersAbove.map(session => { session.rank = ' '; return session })
          codePointsRankingInfo.playersBelow = playersBelow.map(session => { session.rank = ' '; return session })
          myPlayerRow.rank = ' '
        }

        commit('setMyCodePointsRank', myPlayerRow)
      }

      await topCodePointsRankingPromise

      commit('setCodePointsRanking', { leagueId, ranking: codePointsRankingInfo })

      getCodePointsPlayerCount(leagueId, {})
        .then((playerCount) => {
          commit('setCodePointsPlayerCount', Number(playerCount))
        })
        .catch(err => console.error(err))
    },

    async fetchGlobalLeaderboard ({ commit, state }) {
      if (!state.currentRegularArena) return
      const ranking = await getLeaderboard(state.currentRegularArenaOriginal, {
        order: -1,
        scoreOffset: 1000000,
        limit: 20,
        team: 'humans',
        _: Math.floor(Math.random() * 100000000)
      })
      commit('setGlobalRanking', ranking)
    },

    async fetchChampionshipGlobalLeaderboard ({ commit, state }) {
      if (!state.currentChampionshipArena) return
      const ranking = await getLeaderboard(state.currentChampionshipArenaOriginal, {
        order: -1,
        scoreOffset: 1000000,
        limit: 20,
        team: 'humans',
        _: Math.floor(Math.random() * 100000000)
      })
      commit('setChampionshipGlobalRanking', ranking)
    },

    async fetchGlobalLeaderboardPlayerCount ({ commit, state }) {
      if (!state.currentRegularArena) return
      const playerCount = await getLeaderboardPlayerCount(state.currentRegularArenaOriginal, {})
      commit('setGlobalLeaderboardPlayerCount', parseInt(playerCount, 10))
    },

    async fetchChampionshipGlobalLeaderboardPlayerCount ({ commit, state }) {
      if (!state.currentChampionshipArena) return
      const playerCount = await getLeaderboardPlayerCount(state.currentChampionshipArenaOriginal, {})
      commit('setChampionshipGlobalLeaderboardPlayerCount', parseInt(playerCount, 10))
    },

    async fetchUsableArenas ({ commit }) {
      const arenas = await getUsableArenas()
      commit('setUsableArenas', arenas)
    }
  }
}

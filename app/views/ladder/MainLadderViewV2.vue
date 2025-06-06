<template>
  <div
    class="ladder-view-v2 container"
  >
    <div class="ladder-head row">
      <h3 class="ladder-head__title">
        {{ $t('ladder.title') }}
      </h3>
      <h5 class="ladder-head__subtitle">
        {{ $t('play.campaign_multiplayer_description') }}
      </h5>
    </div>
    <div class="ladder-subhead row">
      <a
        v-if="!canUseArenaHelpers"
        href="https://form.typeform.com/to/qXqgbubC?typeform-source=codecombat.com"
        target="_blank"
        class="btn btn-moon"
      >
        {{ $t('general.contact_us') }}
      </a>
      <div
        v-if="canUseArenaHelpers"
        class="ladder-subhead__text"
      >
        {{ $t('league.contact_sales_custom') }}
      </div>
      <div
        v-else
        class="ladder-subhead__text"
      >
        {{ $t('league.without_license_blurb') }}
        <a
          href="https://docs.google.com/presentation/d/1fXzV0gh9U0QqhSDcYYlIOIuM3uivFbdC9UfT1OBydEE/edit#slide=id.gea9e183bfa_0_54"
          target="_blank"
          class="ladder-link"
        >
          {{ $t('league.custom_pricing') }}
        </a>
        {{ $t('league.more_details') }}
      </div>
    </div>
    <div
      v-if="!insideTeacherDashboard"
      class="clan-selector"
    >
      <div>
        {{ $t('tournament.select_team_desc') }}
      </div>
      <clan-selector
        v-if="!isLoading && Array.isArray(myClans) && myClans.length > 0"
        :clans="myClans"
        :selected="idOrSlug"
        style="margin-bottom: 40px;"
        @change="e => changeClanSelected(e)"
      />
    </div>
    <div
      v-if="currentTournaments?.length"
      class="ladder-view container"
    >
      <div class="ladder-view__text">
        {{ $t('tournament.already_create_tournaments_num', { num: currentTournaments.length }) }}
      </div>
      <ladder-panel
        v-for="t in tournamentsTop3"
        :key="t._id"
        class="current-tournaments"
        :arena="arenaMap[t.slug]"
        :clan-id="currentSelectedClan?._id"
        :tournament="t"
        :championship="isChampionship(t.slug)"
        :can-create="false"
        :can-edit="true"
        @edit-tournament="handleEditTournament(t)"
      />
      <div v-if="tournamentsRests.length">
        <div
          id="rest-tournaments"
          class="collapse"
        >
          <ladder-panel
            v-for="t in tournamentsRests"
            :key="t._id"
            class="current-tournaments"
            :arena="arenaMap[t.slug]"
            :clan-id="currentSelectedClan?._id"
            :tournament="t"
            :championship="isChampionship(t.slug)"
            :can-create="false"
            :can-edit="true"
            @edit-tournament="handleEditTournament(t)"
          />
        </div>
        <div
          id="toggle-tournaments"
          data-toggle="collapse"
          data-target="#rest-tournaments"
          aria-expanded="false"
          aria-controls="rest-tournaments"
          :class="{open: expandRestTournaments}"
          @click="expandRestTournaments = !expandRestTournaments"
        >
          <span class="left-bar" />
          <span class="right-bar" />
        </div>
      </div>
    </div>
    <div
      v-if="usableArenas"
      class="ladder-view container"
    >
      <div class="ladder-view__text">
        {{ $t('tournament.can_create_tournaments_num', { num: tournamentsLeft }) }}
      </div>
      <div class="two-col">
        <div class="ladder-view__text center-text">
          {{ $t('league.regular') }}
        </div>
        <div class="ladder-view__text center-text">
          {{ $t('league.championship') }}
        </div>
      </div>
      <div class="two-col">
        <ladder-panel
          v-if="currentRegular"
          :championship="false"
          :arena="currentRegularArena"
          :clan-id="currentSelectedClan?._id"
          :can-create="canUseArenaHelpers && tournamentsLeft > 0"
          :can-edit="false"
          :disabled="tournamentsLeft <= 0"
          @create-tournament="handleCreateTournament(currentRegularArena)"
        />
        <ladder-panel
          v-if="currentChampionship"
          :championship="true"
          :arena="currentChampionshipArena"
          :clan-id="currentSelectedClan?._id"
          :can-create="canUseArenaHelpers && tournamentsLeft > 0"
          :can-edit="false"
          :disabled="tournamentsLeft <= 0"
          @create-tournament="handleCreateTournament(currentChampionshipArena)"
        />
        <div
          v-else
          class="ladder-view__text center-text coming-soon"
        >
          {{ $t('common.coming_soon') }}
        </div>
      </div>
      <div
        v-for="index in maxListLength"
        :key="`list-${index}`"
        class="two-col"
      >
        <ladder-panel
          v-if="sortedRegulars.length > index - 1"
          :championship="false"
          :arena="sortedRegulars[index-1]"
          :clan-id="currentSelectedClan?._id"
          :can-create="canUseArenaHelpers && tournamentsLeft > 0"
          :can-edit="false"
          :disabled="tournamentsLeft <= 0"
          @create-tournament="handleCreateTournament(sortedRegulars[index-1])"
        />
        <ladder-panel
          v-if="sortedChampionships.length > index - 1"
          :championship="true"
          :arena="sortedChampionships[index-1]"
          :clan-id="currentSelectedClan?._id"
          :can-create="canUseArenaHelpers && tournamentsLeft > 0"
          :can-edit="false"
          :disabled="tournamentsLeft <= 0"
          @create-tournament="handleCreateTournament(sortedChampionships[index-1])"
        />
      </div>
    </div>
    <edit-tournament-modal
      v-if="showModal"
      :tournament="editableTournament"
      @close="showModal = false"
      @submit="handleTournamentSubmit"
    />
  </div>
</template>

<script>
import _ from 'lodash'
import moment from 'moment'
import { mapActions, mapGetters } from 'vuex'
import utils from '../../core/utils'
import ClanSelector from '../landing-pages/league/components/ClanSelector.vue'
import LadderPanel from './components/LadderPanel'
import EditTournamentModal from './components/EditTournamentModal'
import { ESPORTS_PRODUCT_STATS, GLOBAL_AI_LEAGUE_CREATORS } from '../../core/constants'

export default {
  name: 'MainLadderViewV2',
  components: {
    ClanSelector, LadderPanel, EditTournamentModal,
  },
  props: {
    idOrSlug: {
      type: String,
      default: 'global',
    },
    insideTeacherDashboard: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      tournamentsLeft: 0,
      showModal: false,
      editableTournament: {},
      expandRestTournaments: false,
    }
  },
  computed: {
    ...mapGetters({
      usableArenas: 'seasonalLeague/usableArenas',
      currentRegular: 'seasonalLeague/currentRegularArena',
      currentChampionship: 'seasonalLeague/currentChampionshipArena',
      myClans: 'clans/myClans',
      isLoading: 'clans/isLoading',
      clanByIdOrSlug: 'clans/clanByIdOrSlug',
      tournamentsByClan: 'clans/tournamentsByClan',
      tournaments: 'clans/tournaments',
      allTournamentsLoaded: 'clans/allTournamentsLoaded',
    }),
    canUseArenaHelpers () {
      return me.isAdmin() || (me.hasAiLeagueActiveProduct() && (!this.currentSelectedClan || this.currentSelectedClan.ownerID === me.get('_id')))
    },
    currentSelectedClan () {
      return this.clanByIdOrSlug(this.idOrSlug) || null
    },
    currentTournaments () {
      if (this.idOrSlug === 'global') {
        return _.flatten(Object.values(this.tournaments))
      }
      if (this.allTournamentsLoaded) {
        return this.tournamentsByClan(this.idOrSlug) || []
      }
      // do not fall back to empty array if not all tournaments loaded
      return this.tournamentsByClan(this.idOrSlug)
    },
    sortedTournaments () {
      return [...this.currentTournaments].sort(utils.tournamentSortFn)
    },
    currentRegularArena () {
      return this.usableArenas.find(a => a.slug === this.currentRegular?.slug)
    },
    currentChampionshipArena () {
      return this.usableArenas.find(a => a.slug === this.currentChampionship?.slug)
    },
    sortedChampionships () {
      const championships = utils.arenas.filter(a => a.type === 'championship').map(a => a.slug)
      return this.usableArenas.filter(t => championships.includes(t.slug) && t.slug !== this.currentChampionship?.slug).sort(this.sortArenaFn)
    },
    sortedRegulars () {
      const championships = utils.arenas.filter(a => a.type === 'championship').map(a => a.slug)
      return this.usableArenas.filter(t => !championships.includes(t.slug) && t.slug !== this.currentRegular?.slug).sort(this.sortArenaFn)
    },
    tournamentsTop3 () {
      return this.sortedTournaments.slice(0, 3)
    },
    tournamentsRests () {
      return this.sortedTournaments.slice(3)
    },
    arenaMap () {
      return _.indexBy(this.usableArenas, 'slug')
    },
    maxListLength () {
      return Math.max(this.sortedRegulars.length, this.sortedChampionships.length)
    },
    isSuper () {
      return GLOBAL_AI_LEAGUE_CREATORS.includes(me.get('_id').toString())
    },
  },
  async created () {
    await this.fetchUsableArenas()
  },
  updated () {
    try {
      $('#flying-focus').css({ top: 0, left: 0 }) // because it creates empty space on bottom of page when coming from /league page
    } catch (err) {
      console.log('flying-focus error deleting', err)
    }
  },
  methods: {
    ...mapActions({
      fetchUsableArenas: 'seasonalLeague/fetchUsableArenas',
      fetchTournamentsForClan: 'clans/fetchTournamentsForClan',
      fetchAllTournaments: 'clans/fetchAllTournaments',
    }),
    sortArenaFn (a, b) {
      // Compare difficulties, defaulting to 999 if undefined
      const difficultyA = a.difficulty ?? 999
      const difficultyB = b.difficulty ?? 999

      if (difficultyA !== difficultyB) {
        return difficultyA - difficultyB
      }

      // Prioritize arenas with a curriculum URL
      const hasCurriculumA = Boolean(a.arenaCurriculumUrl)
      const hasCurriculumB = Boolean(b.arenaCurriculumUrl)

      if (hasCurriculumA && !hasCurriculumB) {
        return -1
      }
      if (!hasCurriculumA && hasCurriculumB) {
        return 1
      }

      // If all else is equal
      return 0
    },
    handleCreateTournament (arena) {
      if (!this.tournamentsLeft && !me.isAdmin()) {
        window.open('https://form.typeform.com/to/qXqgbubC?typeform-source=codecombat.com', '_blank')
      } else {
        /* console.log('handle create', arena) */
        this.editableTournament = {
          name: arena.name,
          levelOriginal: arena.original,
          slug: arena.slug,
          clan: this.idOrSlug,
          state: 'disabled',
          startDate: new Date().toISOString(),
          endDate: moment().add(1, 'day').toISOString(),
          resultsDate: moment().add(3, 'day').toISOString(),
          reviewResults: false,
          publishImmediately: false,
          simulationPriority: 0,
          editing: 'new',
        }
        this.showModal = true
      }
    },
    handleEditTournament (tournament) {
      console.log('handle edit', tournament)
      this.editableTournament = Object.assign({}, tournament, {
        publishImmediately: !(tournament.reviewResults || tournament.resultsDate),
        editing: 'edit',
      })
      this.showModal = true
    },
    fetchTournaments () {
      const newSelectedClan = this.idOrSlug
      if (newSelectedClan === 'global' && !this.isSuper) {
        this.fetchAllTournaments({ userId: me.get('_id') })
      } else {
        this.fetchTournamentsForClan({ clanId: newSelectedClan })
      }
    },
    handleTournamentSubmit () {
      if (this.editableTournament.editing === 'new') {
        this.tournamentsLeft -= 1
      }
      // fetch the tournament so that view refresh
      this.fetchTournaments()
      setTimeout(() => { this.showModal = false }, 1000)
    },
    // if we want to i18n this, then we need to hardcode them in front-end
    hasActiveAiLeagueProduct () {
      return me.hasAiLeagueActiveProduct()
    },
    changeClanSelected (e) {
      let newSelectedClan = ''
      if (e.target.value === 'global') {
        newSelectedClan = ''
      } else {
        newSelectedClan = e.target.value
      }

      const leagueURL = newSelectedClan ? `/league/ladders/${newSelectedClan}` : '/league/ladders'

      application.router.navigate(leagueURL, { trigger: true })
    },
    getCanCreateTournamentNums () {
      const products = me.activeProducts('esports')
      return products.reduce((s, c) => {
        const t = c.productOptions.tournaments
        const upperType = c.productOptions?.type?.toUpperCase()
        const tournaments = typeof t === 'undefined' ? (ESPORTS_PRODUCT_STATS.TOURNAMENTS[upperType] || 0) : t
        const createdTournaments = c.productOptions.createdTournaments || 0
        return s + (tournaments - createdTournaments)
      }, 0)
    },
    isChampionship (slug) {
      return this.sortedChampionships.some(t => t.slug === slug)
    },
  },
  mounted () {
    this.tournamentsLeft = this.getCanCreateTournamentNums()

    if (!this.allTournamentsLoaded) {
      this.fetchTournaments()
    }
  },
}
</script>

<style scoped lang="scss">
@import "app/styles/common/button";
.ladder-view-v2 {
  font-size: 62.5%;
}

.ladder-view {
  padding: 2rem 0;
  margin: 0 auto;
  color: #ffffff;

  .current-tournaments {
    width: 70%;
    margin-bottom: 2rem;
    margin-left: auto;
    margin-right: auto;
  }

  .coming-soon {
    margin-top: auto;
    margin-bottom: auto;
    color: #F7B42C; // coco main yellow
  }

  &__text {
    font-size: 2.4rem;
    font-weight: bold;
    color: #30efd3;
    margin-bottom: 2rem;
  }

  .two-col {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    margin-bottom: 2rem;

    div {
      flex-basis: 45%;
    }
  }
}

.ladder-head {
  text-align: center;

  &__title {
    color: #30efd3;
  }

  &__subtitle {
    color: #fff;
  }
}

.ladder-subhead {
  text-align: center;

  & > * {
    margin-top: 1.5rem;
  }

  &__text {
    color: #ffffff;
    font-size: 1.8rem;
  }
}

.ladder-link {
  color: #30efd3;
  text-decoration: underline;
}

.clan-selector {
  display: flex;
  font-size: 1.8rem;
  color: #fff;
  flex-direction: column;
  align-items: center;
  margin-top: 2rem;
}

#toggle-tournaments {
  $easing: cubic-bezier(.25,1.7,.35,.8);
  $duration: 0.5s;

  height: 2.8em;
  width: 2.8em;
  display:block;
  padding: 0.5em;
  margin: 2.5em auto;
  position: relative;
  cursor: pointer;
  border-radius: 4px;

  .left-bar {
    position: absolute;
    background-color: transparent;
    top: 0;
    left:0;
    width: 40px;
    height: 10px;
    display: block;
    transform: rotate(35deg);
    float: right;
    border-radius: 2px;
    &:after {
      content:"";
      background-color: white;
      width: 40px;
      height: 10px;
      display: block;
      float: right;
      border-radius: 6px 10px 10px 6px;
      transition: all $duration $easing;
      z-index: -1;
    }
  }

  .right-bar {
    position: absolute;
    background-color: transparent;
    top: 0px;
    left:26px;
    width: 40px;
    height: 10px;
    display: block;
    transform: rotate(-35deg);
    float: right;
    border-radius: 2px;
    &:after {
      content:"";
      background-color: white;
      width: 40px;
      height: 10px;
      display: block;
      float: right;
      border-radius: 10px 6px 6px 10px;
      transition: all $duration $easing;
      z-index: -1;
    }
  }
  &.open {
    .left-bar:after {
      transform-origin: center center;
      transform: rotate(-70deg);
    }
    .right-bar:after {
      transform-origin: center center;
      transform: rotate(70deg);
    }
  }
}
.ladder-view-v2.container {
  gap: 20px;
}
.center-text {
  text-align: center;
}
</style>

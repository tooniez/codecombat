<script>
import { validationMixin } from 'vuelidate'
import { required, email, numeric } from 'vuelidate/lib/validators'
import SecondaryButton from './SecondaryButton'
import Modal from './Modal'
import api from 'core/api'
import contact from 'core/contact'

export default Vue.extend({
  components: {
    Modal,
    SecondaryButton
  },
  props: {
    subtitle: {
      type: String,
      // default to DT text
      default: 'Send us a message and our classroom success team will be in touch to help find the best solution for your students\' needs!'
    },
    emailMessage: {
      type: String,
      // default to DT text
      default: ''
    },
    askSchoolInfo: {
      type: Boolean,
      default: true
    },
    licensesNeededText: {
      type: String,
      default: $.i18n.t('teachers.licenses_needed')
    },
    licensesNeededPlaceholder: {
      type: String,
      default: 'How many licenses do you need?'
    },
    modalTitle: {
      type: String,
      default: 'Contact Our Classroom Team'
    },
    backboneDismissModal: {
      type: Boolean,
      default: false
    },
    showModalInitially: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  mixins: [validationMixin],
  data: () => ({
    name: '',
    email: '',
    licensesNeeded: null,
    message: '',
    state: '',
    school: '',
    district: '',
    role: '',
    phone: '',
    sendingInProgress: false,
    showModal: false
  }),
  validations: {
    name: {
      required
    },
    email: {
      required,
      email
    },
    licensesNeeded: {
      required,
      numeric,
      mustBeGreaterThanZero: (value) => value > 0
    },
    message: {},
    school: {},
    district: {},
    role: {},
    phone: {}
  },
  computed: {
    isFormValid () {
      return !this.$v.$invalid
    }
  },
  async mounted () {
    this.showModal = this.showModalInitially

    const trialRequests = await api.trialRequests.getOwn()
    const trialRequest = _.last(_.sortBy(trialRequests, (t) => t.id)) || {}
    const props = trialRequest.properties || {}

    if (props.firstName && props.lastName) {
      this.name = `${props.firstName} ${props.lastName}`
    } else {
      this.name = me.get('name')
    }

    this.state = props.state

    this.email = me.get('email') || props.email

    this.message = this.emailMessage

    this.school = props.nces_name || props.organization || ''
    this.district = props.nces_district || props.district || ''
    this.role = props.role || ''
    this.phone = props.phoneNumber || ''
  },
  methods: {
    closeModal () {
      window.location.href = '#license-interest'
      if (this.showModalInitially === false) {
        this.showModal = false
      }
      this.$emit('close')
    },
    openModal () {
      this.showModal = true
    },
    async onClickSubmit () {
      const params = new URLSearchParams(window.location.search)
      const source = params.get('source')
      let message = this.message
      if (source) {
        message = `Source: ${source}\n\n${message}`
      }
      if (this.isFormValid) {
        const sendObject = {
          country: me.get('country'),
          state: this.state,
          name: this.name,
          email: this.email,
          licensesNeeded: this.licensesNeeded,
          message,
          school: this.school,
          district: this.district,
          role: this.role,
          phone: this.phone,
        }
        this.sendingInProgress = true
        try {
          await contact.send({ data: sendObject })
          this.sendingInProgress = false
          noty({ text: 'Our team has received your request and will reach out to you shortly.', type: 'success', layout: 'center', timeout: 2000 })
          this.$emit('close')
        } catch (e) {
          this.sendingInProgress = false
          noty({ text: 'Couldnt send the message', type: 'error', layout: 'center', timeout: 2000 })
        }
      }
    }
  }
})
</script>

<template>
  <div>
    <modal
      v-if="showModal"
      :title="modalTitle"
      :backbone-dismiss-modal="backboneDismissModal"
      @close="closeModal"
    >
      <div class="style-ozaria teacher-form">
        <span class="sub-title"> {{ subtitle }} </span>
        <form
          class="form-container"
          @submit.prevent="onClickSubmit"
        >
          <div
            class="form-group row name"
            :class="{ 'has-error': $v.name.$error }"
          >
            <div class="col-xs-12">
              <span class="control-label"> {{ $t("general.name") }} </span>
              <input
                v-model="$v.name.$model"
                type="text"
                class="form-control"
              >
              <span
                v-if="!$v.name.required"
                class="form-error"
              > {{ $t("form_validation_errors.required") }} </span>
            </div>
          </div>
          <div
            class="form-group row email"
            :class="{ 'has-error': $v.email.$error }"
          >
            <div class="col-xs-12">
              <span class="control-label"> {{ $t("general.email") }} </span>
              <input
                v-model="$v.email.$model"
                type="text"
                class="form-control"
              >
              <span
                v-if="!$v.email.required"
                class="form-error"
              > {{ $t("form_validation_errors.required") }} </span>
              <span
                v-if="!$v.email.email"
                class="form-error"
              > {{ $t("form_validation_errors.invalidEmail") }} </span>
            </div>
          </div>
          <div
            class="form-group row licensesNeeded"
            :class="{ 'has-error': $v.licensesNeeded.$error }"
          >
            <div class="col-xs-12">
              <span class="control-label"> {{ licensesNeededText }} </span>
              <input
                v-model="$v.licensesNeeded.$model"
                type="text"
                class="form-control"
                :class="{ 'placeholder-text': !licensesNeeded }"
                :placeholder="licensesNeededPlaceholder"
              >
              <span
                v-if="!$v.licensesNeeded.required"
                class="form-error"
              > {{ $t("form_validation_errors.required") }} </span>
              <span
                v-else-if="!$v.licensesNeeded.numeric || !$v.licensesNeeded.mustBeGreaterThanZero"
                class="form-error"
              > {{ $t("form_validation_errors.numberGreaterThanZero") }} </span>
            </div>
          </div>

          <div
            v-if="askSchoolInfo"
            class="form-group row school-district"
          >
            <div class="col-xs-6">
              <span class="control-label"> {{ $t('teachers_quote.organization_label') }} </span>
              <input
                v-model="$v.school.$model"
                type="text"
                class="form-control"
              >
            </div>
            <div class="col-xs-6">
              <span class="control-label"> {{ $t('teachers_quote.district_label') }} </span>
              <input
                v-model="$v.district.$model"
                type="text"
                class="form-control"
              >
            </div>
          </div>

          <div
            v-if="askSchoolInfo"
            class="form-group row phone-role"
          >
            <div class="col-xs-6">
              <span class="control-label"> {{ $t('modal_free_class.phone_number') }} </span>
              <input
                v-model="$v.phone.$model"
                type="text"
                class="form-control"
              >
            </div>
            <div class="col-xs-6">
              <span class="control-label"> {{ $t('teachers_quote.primary_role_label') }} </span>
              <input
                v-model="$v.role.$model"
                type="text"
                class="form-control"
                placeholder="Teacher, Principal, etc."
              >
            </div>
          </div>

          <div
            class="form-group row message"
            :class="{ 'has-error': $v.message.$error }"
          >
            <div class="col-xs-12">
              <span class="control-label"> {{ $t("general.message") }} </span>
              <textarea
                v-model="$v.message.$model"
                :rows="askSchoolInfo ? 2 : 7"
                class="form-control"
                placeholder="Any notes..."
              />
            </div>
          </div>
          <div class="form-group row">
            <div class="col-xs-12 buttons">
              <secondary-button
                v-if="!sendingInProgress"
                type="submit"
                :inactive="!isFormValid"
              >
                {{ $t("common.submit") }}
              </secondary-button>
              <secondary-button
                v-else-if="sendingInProgress"
                type="submit"
                :inactive="true"
              >
                {{ $t("common.sending") }}
              </secondary-button>
            </div>
          </div>
        </form>
      </div>
    </modal>
    <slot
      name="opener"
      :open-modal="openModal"
    />
  </div>
</template>

<style lang="scss" scoped>
@import "../../styles/modal";

.teacher-form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 15px 15px 0px 15px;
  max-width: 600px;
}

.sub-title {
  @include font-p-2-paragraph-medium-gray;
  font-weight: 600;
  color: $pitch;
}

.form-container {
  width: 100%;
  min-width: 600px;
  margin-top: 10px;
}

.buttons {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: flex-end;
  margin-top: 10px;

  button {
    width: 150px;
    height: 35px;
    margin: 0 10px;
  }
}

.control-label {
  font-size: 18px;
}
</style>

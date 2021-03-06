<template>
  <q-dialog
    v-model="dialog"
    transition-show="rotate"
    transition-hide="rotate"
    persistent
  >
    <div class="dialog">
      <q-layout view="Lhh lpR fff" class="bg-white">

        <q-header class="glossy bg-black">
          <q-toolbar>
            <q-btn
              :label="statusOld.name"
              class="glossy text-black status-title"
              :class="statusOld.color" />

            <q-icon size="32px" name="arrow_forward" class="text-white" />

            <q-btn
              :label="statusNew.name"
              class="glossy text-black status-title"
              :class="statusNew.color" />
            <q-btn v-close-popup round dense size="18px" icon="close" @click="cleanFields()" />
          </q-toolbar>
        </q-header>

        <q-page-container>

          <q-page padding>
            <q-form
              @submit.prevent="onSubmit()"
              class="q-gutter-md">

              <q-select
                ref="reason"
                outlined
                required
                v-model="reason"
                :options="statusWithReasons"
                :option-value="opt => Object(opt) === opt && 'id' in opt ? opt.id : ''"
                :option-label="opt => Object(opt) === opt && 'name' in opt ? opt.name : ''"
                label="Motivo*"
              >

                <template v-slot:prepend>
                  <q-icon name="short_text" />
                </template>
              </q-select>

              <q-input
                ref="expectedReturn"
                type="time"
                :label="expectedReturnLabel"
                outlined
                v-model="expectedReturn"
              >
                <template v-slot:prepend>
                  <q-icon name="access_time" />
                </template>
              </q-input>

              <q-input outlined
                ref="note"
                :required="isNoteRequired"
                v-model="note"
                label="Anotação"
                type="textarea"
                maxlength="100"
                :hint="note ? note.length + ' de 100' : '0 de 100'"
              >
                <template v-slot:append>
                  <q-toggle
                    glossy
                    unelevated
                    v-model="rememberNote"
                    checked-icon="check"
                    color="primary"
                    unchecked-icon="clear"
                  >
                    <q-tooltip
                      content-class="bg-indigo"
                      content-style="font-size: 16px"
                      :offset="[10, 10]"
                      sta
                    >
                      Lembrar
                    </q-tooltip>
                  </q-toggle>
                </template>
                <template v-slot:prepend>
                  <q-icon name="view_headline" />
                </template>
              </q-input>

              <div class= "div-btn">
                <q-btn
                  glossy
                  unelevated
                  push
                  type="submit"
                  color="primary"
                  text-color="black"
                  class="full-width"
                  size="lg"
                >
                  <q-icon size="32px" name="edit" class="text-black" />
                  Alterar
                </q-btn>
              </div>

            </q-form>
          </q-page>
        </q-page-container>
      </q-layout>
    </div>
  </q-dialog>
</template>

<script>
import { LocalStorage } from 'quasar'

export default {
  name: 'DialogChangeStatus',
  data () {
    return {
      statusWithReasons: [],
      expectedReturnLabel: '',
      statusOld: '',
      statusNew: '',
      reason: '',
      expectedReturn: '',
      note: '',
      dialog: false,
      isNoteRequired: false,
      rememberNote: false
    }
  },
  watch: {
    reason: function (newValue) {
      if (newValue.expectedReturn) {
        this.expectedReturn = this.$globals
          .createTime(newValue.expectedReturn)
      }

      this.isNoteRequired = false
      if (newValue.name && newValue.name.toUpperCase() === 'OUTROS') {
        this.isNoteRequired = true
      }
    }
  },
  created () {
    this.$root.$on('DialogChangeStatus::show', (statusNew, statusOld) => {
      this.statusNew = statusNew
      this.statusOld = statusOld
      this.expectedReturnLabel = `${this.statusNew.name} até às`
      this.getStatuses()

      this.setStatusDefault(statusNew)

      if (LocalStorage.getItem(`statuze_status_${this.statusNew.id}`)) {
        this.note = LocalStorage.getItem(`statuze_status_${this.statusNew.id}`)
        this.rememberNote = true
      }

      this.dialog = true
    })
  },
  methods: {
    getStatuses () {
      this.$statuzeBackendAPI.get(`/status/${this.statusNew.id}`)
        .then((response) => {
          if (response.data.data) {
            response.data.data.reasons.map(reason => {
              this.statusWithReasons.push({
                id: reason.id,
                name: reason.name,
                expectedReturn: reason.expected_return
              })
            })
          }
        })
    },
    hasErrorInForm (data) {
      if (!data.status || !data.reason || typeof (data.reason) === 'undefined') {
        return 'O informe os campos obrigatórios'
      }

      if (this.expectedReturn && this.expectedReturn <= this.$globals.getTime('EN', null)) {
        return 'A hora prevista do status deve ser maior que a atual.'
      }

      return false
    },
    onSubmit () {
      const data = {
        status: this.statusNew.id,
        reason: this.reason.id,
        to: this.expectedReturn ? this.$globals.formatDateTime(this.expectedReturn) : '',
        note: this.note
      }

      const errorMessage = this.hasErrorInForm(data)
      if (errorMessage) {
        this.$globals.showNotify('error', errorMessage)
      } else {
        if (this.rememberNote) {
          LocalStorage.set(`statuze_status_${this.statusNew.id}`, data.note)
        } else {
          LocalStorage.set(`statuze_status_${this.statusNew.id}`, '')
        }

        this.dialog = false
        this.tryChangeStatus(data)
      }
    },
    tryChangeStatus (data) {
      this.$statuzeBackendAPI.post('/user-status', data)
        .then((response) => {
          this.$root.$emit('ListStatus::added', this.statusNew)
          this.$root.$emit('ListStatus::removed', this.statusOld)
          this.$globals.refreshPage()
        })
        .catch((error) => {
          this.$globals.showNotify('error', error.message)
        })
    },
    setStatusDefault (status) {
      if (status.name === 'Disponível') {
        this.reason = { id: 9, name: 'Fale Comigo' }
      }

      if (status.name === 'Deslogado') {
        this.reason = { id: 7, name: 'Sair Fora' }
      }
    },
    cleanFields () {
      this.statusWithReasons = []
      this.note = ''
      this.reason = ''
      this.expectedReturn = ''
      this.expectedReturnLabel = ''
      this.rememberNote = false
    }
  }
}
</script>
<style scoped>
.dialog {
  width: 350px;
  height: 460px;
  overflow: hidden;
  background-color: transparent;
}
.div-btn {
  width: 100%;
  padding: 0 15px 0 0;
}
</style>

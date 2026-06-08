<template>
  <span class="badge" :class="cls">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ status: String })

const MAP = {
  approved:       ['badge-approved',   'Aprovado'],
  disbursed:      ['badge-disbursed',  'Desembolsado'],
  submitted:      ['badge-submitted',  'Submetido'],
  under_review:   ['badge-review',     'Em análise'],
  docs_requested: ['badge-warning',    'Docs solicitados'],
  rejected:       ['badge-danger',     'Rejeitado'],
  draft:          ['badge-neutral',    'Rascunho'],
  active:         ['badge-approved',   'Activo'],
  suspended:      ['badge-warning',    'Suspenso'],
  pending:        ['badge-queued',     'Pendente'],
  overdue:        ['badge-overdue',    'Em falta'],
  completed:      ['badge-completed',  'Liquidado'],
  written_off:    ['badge-danger',     'Abatido'],
  sent:           ['badge-sent',       'Enviado'],
  delivered:      ['badge-delivered',  'Entregue'],
  failed:         ['badge-failed',     'Falhado'],
  queued:         ['badge-queued',     'Em fila'],
  sending:        ['badge-queued',     'A enviar'],
  bounced:        ['badge-failed',     'Bounce'],
  confirmed:      ['badge-sent',       'Confirmado'],
  kyc_approved:   ['badge-approved',   'Verificado'],
  kyc_pending:    ['badge-warning',    'Pendente'],
  kyc_incomplete: ['badge-neutral',    'Incompleto'],
  kyc_rejected:   ['badge-danger',     'Rejeitado'],
}

const cls   = computed(() => MAP[props.status]?.[0] ?? 'badge-neutral')
const label = computed(() => MAP[props.status]?.[1] ?? (props.status ?? '—'))
</script>

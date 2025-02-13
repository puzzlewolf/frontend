<template>
	<div
		class="reminder-period control"
	>
		<input
			class="input"
			v-model.number="period.duration"
			type="number"
			min="0"
			@change="updateData"
		/>

		<div class="select">
			<select v-model="period.durationUnit" @change="updateData">
				<option value="minutes">{{ $t('time.units.minutes', period.duration) }}</option>
				<option value="hours">{{ $t('time.units.hours', period.duration) }}</option>
				<option value="days">{{ $t('time.units.days', period.duration) }}</option>
				<option value="weeks">{{ $t('time.units.weeks', period.duration) }}</option>
			</select>
		</div>

		<div class="select">
			<select v-model.number="period.sign" @change="updateData">
				<option value="-1">
					{{ $t('task.reminder.beforeShort') }}
				</option>
				<option value="1">
					{{ $t('task.reminder.afterShort') }}
				</option>
			</select>
		</div>

		<div class="select">
			<select v-model="period.relativeTo" @change="updateData">
				<option :value="REMINDER_PERIOD_RELATIVE_TO_TYPES.DUEDATE">
					{{ $t('task.attributes.dueDate') }}
				</option>
				<option :value="REMINDER_PERIOD_RELATIVE_TO_TYPES.STARTDATE">
					{{ $t('task.attributes.startDate') }}
				</option>
				<option :value="REMINDER_PERIOD_RELATIVE_TO_TYPES.ENDDATE">
					{{ $t('task.attributes.endDate') }}
				</option>
			</select>
		</div>
	</div>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue'

import {periodToSeconds, PeriodUnit, secondsToPeriod} from '@/helpers/time/period'

import TaskReminderModel from '@/models/taskReminder'

import type {ITaskReminder} from '@/modelTypes/ITaskReminder'
import {REMINDER_PERIOD_RELATIVE_TO_TYPES, type IReminderPeriodRelativeTo} from '@/types/IReminderPeriodRelativeTo'
import {useDebounceFn} from '@vueuse/core'

const {
	modelValue,
} = defineProps<{
	modelValue?: ITaskReminder,
}>()

const emit = defineEmits(['update:modelValue'])

const reminder = ref<ITaskReminder>(new TaskReminderModel())

interface PeriodInput {
	duration: number,
	durationUnit: PeriodUnit,
	relativeTo: IReminderPeriodRelativeTo,
	sign: -1 | 1,
}

const period = ref<PeriodInput>({
	duration: 0,
	durationUnit: 'hours',
	relativeTo: REMINDER_PERIOD_RELATIVE_TO_TYPES.DUEDATE,
	sign: -1,
})

watch(
	() => modelValue,
	(value) => {
		const p = secondsToPeriod(value?.relativePeriod)
		period.value.durationUnit = p.unit
		period.value.duration = Math.abs(p.amount)
		period.value.relativeTo = value?.relativeTo || REMINDER_PERIOD_RELATIVE_TO_TYPES.DUEDATE
	},
	{immediate: true},
)

watch(
	() => period.value.duration,
	value => {
		if (value < 0) {
			period.value.duration = value * -1
		}
	},
)

function updateData() {
	reminder.value.relativePeriod = period.value.sign * periodToSeconds(Math.abs(period.value.duration), period.value.durationUnit)
	reminder.value.relativeTo = period.value.relativeTo
	reminder.value.reminder = null

	useDebounceFn(() => emit('update:modelValue', reminder.value), 1000)
}
</script>

<style lang="scss" scoped>
.reminder-period {
	display: flex;
	flex-direction: column;
	gap: .25rem;
	padding: .5rem .5rem 0;

	.input, .select select {
		width: 100% !important;
		height: auto;
	}
}
</style>
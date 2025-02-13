<template>
	<div>
		<Popup @close="showFormSwitch = null">
			<template #trigger="{toggle}">
				<SimpleButton
					v-tooltip="reminder.reminder && reminder.relativeTo !== null ? formatDateShort(reminder.reminder) : null"
					@click.prevent.stop="toggle()"
				>
					{{ reminderText }}
				</SimpleButton>
			</template>
			<template #content="{isOpen, close}">
				<Card class="reminder-options-popup" :class="{'is-open': isOpen}" :padding="false">
					<div class="options" v-if="activeForm === null">
						<SimpleButton
							v-for="(p, k) in presets"
							:key="k"
							class="option-button"
							:class="{'currently-active': p.relativePeriod === modelValue?.relativePeriod && modelValue?.relativeTo === p.relativeTo}"
							@click="setReminderFromPreset(p, close)"
						>
							{{ formatReminder(p) }}
						</SimpleButton>
						<SimpleButton
							@click="showFormSwitch = 'relative'"
							class="option-button"
							:class="{'currently-active': typeof modelValue !== 'undefined' && modelValue?.relativeTo !== null && presets.find(p => p.relativePeriod === modelValue?.relativePeriod && modelValue?.relativeTo === p.relativeTo) === undefined}"
						>
							{{ $t('task.reminder.custom') }}
						</SimpleButton>
						<SimpleButton
							@click="showFormSwitch = 'absolute'"
							class="option-button"
							:class="{'currently-active': modelValue?.relativeTo === null}"
						>
							{{ $t('task.reminder.dateAndTime') }}
						</SimpleButton>
					</div>

					<ReminderPeriod
						v-if="activeForm === 'relative'"
						v-model="reminder"
						@update:modelValue="updateDataAndMaybeClose(close)"
					/>

					<DatepickerInline
						v-if="activeForm === 'absolute'"
						v-model="reminderDate"
						@update:modelValue="setReminderDate(close)"
					/>

					<x-button
						v-if="showFormSwitch !== null"
						class="reminder__close-button"
						:shadow="false"
						@click="updateDataAndMaybeClose(close)"
					>
						{{ $t('misc.confirm') }}
					</x-button>
				</Card>
			</template>
		</Popup>
	</div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {SECONDS_A_DAY, SECONDS_A_HOUR} from '@/constants/date'
import {IReminderPeriodRelativeTo, REMINDER_PERIOD_RELATIVE_TO_TYPES} from '@/types/IReminderPeriodRelativeTo'
import {useI18n} from 'vue-i18n'

import {PeriodUnit, secondsToPeriod} from '@/helpers/time/period'
import type {ITaskReminder} from '@/modelTypes/ITaskReminder'
import {formatDateShort} from '@/helpers/time/formatDate'

import DatepickerInline from '@/components/input/datepickerInline.vue'
import ReminderPeriod from '@/components/tasks/partials/reminder-period.vue'
import Popup from '@/components/misc/popup.vue'

import TaskReminderModel from '@/models/taskReminder'
import Card from '@/components/misc/card.vue'
import SimpleButton from '@/components/input/SimpleButton.vue'

const {t} = useI18n({useScope: 'global'})

const {
	modelValue,
	clearAfterUpdate = false,
	defaultRelativeTo = REMINDER_PERIOD_RELATIVE_TO_TYPES.DUEDATE,
} = defineProps<{
	modelValue?: ITaskReminder,
	clearAfterUpdate?: boolean,
	defaultRelativeTo?: null | IReminderPeriodRelativeTo,
}>()

const emit = defineEmits(['update:modelValue'])

const reminder = ref<ITaskReminder>(new TaskReminderModel())

const presets = computed<TaskReminderModel[]>(() => [
	{reminder: null, relativePeriod: 0, relativeTo: defaultRelativeTo},
	{reminder: null, relativePeriod: -2 * SECONDS_A_HOUR, relativeTo: defaultRelativeTo},
	{reminder: null, relativePeriod: -1 * SECONDS_A_DAY, relativeTo: defaultRelativeTo},
	{reminder: null, relativePeriod: -1 * SECONDS_A_DAY * 3, relativeTo: defaultRelativeTo},
	{reminder: null, relativePeriod: -1 * SECONDS_A_DAY * 7, relativeTo: defaultRelativeTo},
	{reminder: null, relativePeriod: -1 * SECONDS_A_DAY * 30, relativeTo: defaultRelativeTo},
])
const reminderDate = ref(null)

type availableForms = null | 'relative' | 'absolute'

const showFormSwitch = ref<availableForms>(null)

const activeForm = computed<availableForms>(() => {
	if (defaultRelativeTo === null) {
		return 'absolute'
	}

	return showFormSwitch.value
})

const reminderText = computed(() => {

	if (reminder.value.relativeTo !== null) {
		return formatReminder(reminder.value)
	}

	if (reminder.value.reminder !== null) {
		return formatDateShort(reminder.value.reminder)
	}

	return t('task.addReminder')
})

watch(
	() => modelValue,
	(newReminder) => {
		reminder.value = newReminder || new TaskReminderModel()
	},
	{immediate: true},
)

function updateData() {
	emit('update:modelValue', reminder.value)

	if (clearAfterUpdate) {
		reminder.value = new TaskReminderModel()
	}
}

function setReminderDate(close) {
	reminder.value.reminder = reminderDate.value === null
		? null
		: new Date(reminderDate.value)
	reminder.value.relativeTo = null
	reminder.value.relativePeriod = 0
	updateDataAndMaybeClose(close)
}


function setReminderFromPreset(preset, close) {
	reminder.value = preset
	updateData()
	close()
}

function updateDataAndMaybeClose(close) {
	updateData()
	if (clearAfterUpdate) {
		close()
	}
}

function formatReminder(reminder: TaskReminderModel) {
	const period = secondsToPeriod(reminder.relativePeriod)

	if (period.amount === 0) {
		switch (reminder.relativeTo) {
			case REMINDER_PERIOD_RELATIVE_TO_TYPES.DUEDATE:
				return t('task.reminder.onDueDate')
			case REMINDER_PERIOD_RELATIVE_TO_TYPES.STARTDATE:
				return t('task.reminder.onStartDate')
			case REMINDER_PERIOD_RELATIVE_TO_TYPES.ENDDATE:
				return t('task.reminder.onEndDate')
		}
	}

	const amountAbs = Math.abs(period.amount)

	let relativeTo = ''
	switch (reminder.relativeTo) {
		case REMINDER_PERIOD_RELATIVE_TO_TYPES.DUEDATE:
			relativeTo = t('task.attributes.dueDate')
			break
		case REMINDER_PERIOD_RELATIVE_TO_TYPES.STARTDATE:
			relativeTo = t('task.attributes.startDate')
			break
		case REMINDER_PERIOD_RELATIVE_TO_TYPES.ENDDATE:
			relativeTo = t('task.attributes.endDate')
			break
	}

	if (reminder.relativePeriod <= 0) {
		return t('task.reminder.before', {
			amount: amountAbs,
			unit: translateUnit(amountAbs, period.unit),
			type: relativeTo,
		})
	}

	return t('task.reminder.after', {
		amount: amountAbs,
		unit: translateUnit(amountAbs, period.unit),
		type: relativeTo,
	})
}

function translateUnit(amount: number, unit: PeriodUnit): string {
	switch (unit) {
		case 'seconds':
			return t('time.units.seconds', amount)
		case 'minutes':
			return t('time.units.minutes', amount)
		case 'hours':
			return t('time.units.hours', amount)
		case 'days':
			return t('time.units.days', amount)
		case 'weeks':
			return t('time.units.weeks', amount)
		case 'years':
			return t('time.units.years', amount)
	}
}
</script>

<style lang="scss" scoped>
.options {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

:deep(.popup) {
	top: unset;
}

.reminder-options-popup {
	width: 310px;
	z-index: 99;

	@media screen and (max-width: ($tablet)) {
		width: calc(100vw - 5rem);
	}

	.option-button {
		font-size: .85rem;
		border-radius: 0;
		padding: .5rem;
		margin: 0;

		&:hover {
			background: var(--grey-100);
		}
	}
}

.reminder__close-button {
	margin: .5rem;
	width: calc(100% - 1rem);
}

.currently-active {
	color: var(--primary);
}
</style>

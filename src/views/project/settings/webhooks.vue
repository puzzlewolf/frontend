<script lang="ts">
export default {name: 'project-setting-webhooks'}
</script>

<script lang="ts" setup>
import {ref, computed, watchEffect} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {useTitle} from '@vueuse/core'

import ProjectService from '@/services/project'
import ProjectModel from '@/models/project'
import type {IProject} from '@/modelTypes/IProject'

import CreateEdit from '@/components/misc/create-edit.vue'

import {useBaseStore} from '@/stores/base'
import type {IWebhook} from '@/modelTypes/IWebhook'
import WebhookService from '@/services/webhook'
import {formatDateShort} from '@/helpers/time/formatDate'
import User from '@/components/misc/user.vue'
import WebhookModel from '@/models/webhook'
import BaseButton from '@/components/base/BaseButton.vue'
import Fancycheckbox from '@/components/input/fancycheckbox.vue'
import {success} from '@/message'
import {isValidHttpUrl} from '@/helpers/isValidHttpUrl'

const {t} = useI18n({useScope: 'global'})

const project = ref<IProject>()
useTitle(t('project.webhooks.title'))

const showNewForm = ref(false)

async function loadProject(projectId: number) {
	const projectService = new ProjectService()
	const newProject = await projectService.get(new ProjectModel({id: projectId}))
	await useBaseStore().handleSetCurrentProject({project: newProject})
	project.value = newProject
	await loadWebhooks()
}

const route = useRoute()
const projectId = computed(() => route.params.projectId !== undefined
	? parseInt(route.params.projectId as string)
	: undefined,
)

watchEffect(() => projectId.value !== undefined && loadProject(projectId.value))

const webhooks = ref<IWebhook[]>()
const webhookService = new WebhookService()
const availableEvents = ref<string[]>()

async function loadWebhooks() {
	webhooks.value = await webhookService.getAll({projectId: project.value.id})
	availableEvents.value = await webhookService.getAvailableEvents()
}

const showDeleteModal = ref(false)
const webhookIdToDelete = ref<number>()

async function deleteWebhook() {
	await webhookService.delete({
		id: webhookIdToDelete.value,
		projectId: project.value.id,
	})
	showDeleteModal.value = false
	success({message: t('project.webhooks.deleteSuccess')})
	await loadWebhooks()
}

const newWebhook = ref(new WebhookModel())
const newWebhookEvents = ref({})

async function create() {

	validateTargetUrl()
	if (!webhookTargetUrlValid.value) {
		return
	}

	const selectedEvents = getSelectedEventsArray()
	newWebhook.value.events = selectedEvents

	validateSelectedEvents()
	if (!selectedEventsValid.value) {
		return
	}

	newWebhook.value.projectId = project.value.id
	const created = await webhookService.create(newWebhook.value)
	webhooks.value.push(created)
	newWebhook.value = new WebhookModel()
	showNewForm.value = false
}

const webhookTargetUrlValid = ref(true)

function validateTargetUrl() {
	webhookTargetUrlValid.value = isValidHttpUrl(newWebhook.value.targetUrl)
}

const selectedEventsValid = ref(true)

function getSelectedEventsArray() {
	return Object.entries(newWebhookEvents.value)
		.filter(([_, use]) => use)
		.map(([event]) => event)
}

function validateSelectedEvents() {
	const events = getSelectedEventsArray()
	if (events.length === 0) {
		selectedEventsValid.value = false
	}
}
</script>

<template>
	<create-edit
		:title="$t('project.webhooks.title')"
		:has-primary-action="false"
		:wide="true"
	>
		<x-button
			v-if="!(webhooks?.length === 0 || showNewForm)"
			@click="showNewForm = true"
			icon="plus"
			class="mb-4">
			{{ $t('project.webhooks.create') }}
		</x-button>

		<div class="p-4" v-if="webhooks?.length === 0 || showNewForm">
			<div class="field">
				<label class="label" for="targetUrl">
					{{ $t('project.webhooks.targetUrl') }}
				</label>
				<div class="control">
					<input
						required
						id="targetUrl"
						class="input"
						:placeholder="$t('project.webhooks.targetUrl')"
						v-model="newWebhook.targetUrl"
						@focusout="validateTargetUrl"
					/>
				</div>
				<p class="help is-danger" v-if="!webhookTargetUrlValid">
					{{ $t('project.webhooks.targetUrlInvalid') }}
				</p>
			</div>
			<div class="field">
				<label class="label" for="secret">
					{{ $t('project.webhooks.secret') }}
				</label>
				<div class="control">
					<input
						id="secret"
						class="input"
						v-model="newWebhook.secret"
					/>
				</div>
				<p class="help">
					{{ $t('project.webhooks.secretHint') }}
					<BaseButton href="https://vikunja.io/docs/webhooks/">
						{{ $t('project.webhooks.secretDocs') }}
					</BaseButton>
				</p>
			</div>
			<div class="field">
				<label class="label" for="secret">
					{{ $t('project.webhooks.events') }}
				</label>
				<p class="help">
					{{ $t('project.webhooks.eventsHint') }}
				</p>
				<div class="control">
					<fancycheckbox
						v-for="event in availableEvents"
						:key="event"
						class="available-events-check"
						v-model="newWebhookEvents[event]"
						@update:model-value="validateSelectedEvents"
					>
						{{ event }}
					</fancycheckbox>
				</div>
				<p class="help is-danger" v-if="!selectedEventsValid">
					{{ $t('project.webhooks.mustSelectEvents') }}
				</p>
			</div>
			<x-button @click="create" icon="plus">
				{{ $t('project.webhooks.create') }}
			</x-button>
		</div>

		<table
			class="table has-actions is-striped is-hoverable is-fullwidth"
			v-if="webhooks?.length > 0"
		>
			<thead>
			<tr>
				<th>{{ $t('project.webhooks.targetUrl') }}</th>
				<th>{{ $t('project.webhooks.events') }}</th>
				<th>{{ $t('misc.created') }}</th>
				<th>{{ $t('misc.createdBy') }}</th>
				<th></th>
			</tr>
			</thead>
			<tbody>
			<tr :key="w.id" v-for="w in webhooks">
				<td>{{ w.targetUrl }}</td>
				<td>{{ w.events.join(', ') }}</td>
				<td>{{ formatDateShort(w.created) }}</td>
				<td>
					<User
						:avatar-size="25"
						:user="w.createdBy"
					/>
				</td>

				<td class="actions">
					<x-button
						@click="() => {showDeleteModal = true;webhookIdToDelete = w.id}"
						class="is-danger"
						icon="trash-alt"
					/>
				</td>
			</tr>
			</tbody>
		</table>

		<modal
			:enabled="showDeleteModal"
			@close="showDeleteModal = false"
			@submit="deleteWebhook()"
		>
			<template #header>
				<span>{{ $t('project.webhooks.delete') }}</span>
			</template>

			<template #text>
				<p>{{ $t('project.webhooks.deleteText') }}</p>
			</template>
		</modal>
	</create-edit>
</template>

<style lang="scss" scoped>
.available-events-check {
	margin-right: .5rem;
	width: 12.5rem;
}
</style>

<template>
	<div :class="{ 'is-loading': loading}" class="loader-container">
		<x-button
			:to="{name:'labels.create'}"
			class="is-pulled-right"
			icon="plus"
		>
			{{ $t('label.create.header') }}
		</x-button>

		<div class="content">
			<h1>{{ $t('label.manage') }}</h1>
			<p v-if="Object.entries(labels).length > 0">
				{{ $t('label.description') }}
			</p>
			<p v-else class="has-text-centered has-text-grey is-italic">
				{{ $t('label.newCTA') }}
				<router-link :to="{name:'labels.create'}">{{ $t('label.create.title') }}.</router-link>
			</p>
		</div>

		<div class="columns">
			<div class="labels-list column">
				<span
					:class="{'disabled': userInfo.id !== l.createdBy.id}" :key="l.id"
					:style="{'background': l.hexColor, 'color': l.textColor}"
					class="tag"
					v-for="l in labels"
				>
					<span
						v-if="userInfo.id !== l.createdBy.id"
						v-tooltip.bottom="$t('label.edit.forbidden')">
						{{ l.title }}
					</span>
					<BaseButton
						:style="{'color': l.textColor}"
						@click="editLabel(l)"
						v-else>
						{{ l.title }}
					</BaseButton>
					<BaseButton @click="showDeleteDialoge(l)" class="delete is-small" v-if="userInfo.id === l.createdBy.id" />
				</span>
			</div>
			<div class="column is-4" v-if="isLabelEdit">
				<card :title="$t('label.edit.header')" :has-close="true" @close="() => isLabelEdit = false">
					<form @submit.prevent="editLabelSubmit()">
						<div class="field">
							<label class="label">{{ $t('label.attributes.title') }}</label>
							<div class="control">
								<input
									class="input"
									:placeholder="$t('label.attributes.titlePlaceholder')"
									type="text"
									v-model="labelEditLabel.title"/>
							</div>
						</div>
						<div class="field">
							<label class="label">{{ $t('label.attributes.description') }}</label>
							<div class="control">
								<editor
									:placeholder="$t('label.attributes.description')"
									v-if="editorActive"
									v-model="labelEditLabel.description"
								/>
							</div>
						</div>
						<div class="field">
							<label class="label">{{ $t('label.attributes.color') }}</label>
							<div class="control">
								<color-picker v-model="labelEditLabel.hexColor"/>
							</div>
						</div>
						<div class="field has-addons">
							<div class="control is-expanded">
								<x-button
									:loading="loading"
									class="is-fullwidth"
									@click="editLabelSubmit()"
								>
									{{ $t('misc.save') }}
								</x-button>
							</div>
							<div class="control">
								<x-button
									@click="showDeleteDialoge(labelEditLabel)"
									icon="trash-alt"
									class="is-danger"
								/>
							</div>
						</div>
					</form>
				</card>
			</div>

			<modal
				:enabled="showDeleteModal"
				@close="showDeleteModal = false"
				@submit="deleteLabel(labelToDelete)"
			>
				<template #header><span>{{ $t('task.label.delete.header') }}</span></template>

				<template #text>
					<p>{{ $t('task.label.delete.text1') }}<br/>
						{{ $t('task.label.delete.text2') }}</p>
				</template>
			</modal>
		</div>
	</div>
</template>

<script setup lang="ts">
import {computed, nextTick, ref} from 'vue'
import {useI18n} from 'vue-i18n'

import BaseButton from '@/components/base/BaseButton.vue'
import Editor from '@/components/input/AsyncEditor'
import ColorPicker from '@/components/input/ColorPicker.vue'

import LabelModel from '@/models/label'
import type {ILabel} from '@/modelTypes/ILabel'
import {useAuthStore} from '@/stores/auth'
import {useLabelStore} from '@/stores/labels'

import { useTitle } from '@/composables/useTitle'

const {t} = useI18n({useScope: 'global'})

const labelEditLabel = ref<ILabel>(new LabelModel())
const isLabelEdit = ref(false)
const editorActive = ref(false)
const showDeleteModal = ref(false)
const labelToDelete = ref<ILabel>(null)

useTitle(() => t('label.title'))

const authStore = useAuthStore()
const userInfo = computed(() => authStore.info)

const labelStore = useLabelStore()
labelStore.loadAllLabels()

// Alphabetically sort the labels
const labels = computed(() => Object.values(labelStore.labels).sort((f, s) => f.title > s.title ? 1 : -1))
const loading = computed(() => labelStore.isLoading)

function deleteLabel(label: ILabel) {
	showDeleteModal.value = false
	isLabelEdit.value = false
	return labelStore.deleteLabel(label)
}

function editLabelSubmit() {
	return labelStore.updateLabel(labelEditLabel.value)
}

function editLabel(label: ILabel) {
	if (label.createdBy.id !== userInfo.value.id) {
		return
	}
	// Duplicating the label to make sure it does not look like changes take effect immediatly as the label 
	// object passed to this function here still has a reference to the store.
	labelEditLabel.value = new LabelModel({
		...label,
		// The model does not support passing dates into it directly so we need to convert them first				
		created: +label.created,
		updated: +label.updated,
	})
	isLabelEdit.value = true

	// This makes the editor trigger its mounted function again which makes it forget every input
	// it currently has in its textarea. This is a counter-hack to a hack inside of vue-easymde
	// which made it impossible to detect change from the outside. Therefore the component would
	// not update if new content from the outside was made available.
	// See https://github.com/NikulinIlya/vue-easymde/issues/3
	editorActive.value = false
	nextTick(() => editorActive.value = true)
}

function showDeleteDialoge(label: ILabel) {
	labelToDelete.value = label
	showDeleteModal.value = true
}
</script>

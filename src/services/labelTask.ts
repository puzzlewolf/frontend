import AbstractService from './abstractService'
import LabelTask, {type ILabelTask} from '@/models/labelTask'

export default class LabelTaskService extends AbstractService<ILabelTask> {
	constructor() {
		super({
			create: '/tasks/{taskId}/labels',
			getAll: '/tasks/{taskId}/labels',
			delete: '/tasks/{taskId}/labels/{labelId}',
		})
	}

	modelFactory(data) {
		return new LabelTask(data)
	}
}
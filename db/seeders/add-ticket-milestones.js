'use strict';

require('../../../../../common/utils');

const kMilestones = [
	{
		name: 'Project Initiation',
		description: 'Marks the beginning of the project, where objectives are defined, stakeholders are identified, and initial planning is conducted'
	},

	{
		name: 'Project Charter Approval ',
		description: 'Signifies the approval of the project charter, which outlines the project\'s scope, objectives, deliverables, and stakeholders'
	},


	{
		name: 'Requirements Gathering Complete',
		description: 'Indicates the completion of gathering and documenting project requirements from stakeholders'
	},

	{
		name: 'Design Phase Completion',
		description: ' Marks the completion of the design phase, including system architecture, user interface design, and technical specifications'
	},

	{
		name: 'Development',
		description: 'Marks significant progress in the development phase, such as the completion of a major module or feature'
	},

	{
		name: 'Prototype Demonstration',
		description: 'Showcases a functional prototype to stakeholders for feedback and validation of requirements'
	},


	{
		name: 'Testing Phase Start',
		description: 'Marks the beginning of the testing phase, including unit testing, integration testing, and system testing'
	},

	{
		name: 'User Acceptance Testing (UAT) Sign-Off',
		description: ' Indicates that the project has passed user acceptance testing and is approved by stakeholders for deployment'
	},

	{
		name: 'Deployment',
		description: 'Marks the deployment of the project to production or live environment'
	},

	{
		name: 'Go-Live',
		description: 'Marks the official launch of the project and transition to operational status'
	},

	{
		name: 'Project Closure',
		description: 'Signifies the formal closure of the project, including final documentation, handover of deliverables, and lessons learned'
	},

	// {
	// 	name: '',
	// 	description: ''
	// },
];


module.exports = {
	up (queryInterface, Sequelize) {

		const now = Date.now();

		for (let i = 0; i < kMilestones.length; i++)
			kMilestones[i].due = Date.days((i + 1) * 10, now);


		return queryInterface.bulkInsert('milestone', kMilestones);
	},

	down (queryInterface, Sequelize) {
	}
};

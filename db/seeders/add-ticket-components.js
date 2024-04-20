'use strict';

const kComponents = [
	{
		name: "Requirements Document",
		description: "A document outlining project requirements, including functional and non-functional specifications."
	  },
	  {
		name: "Design Specifications",
		description: "Detailed specifications defining the architecture, user interface, and technical design of the project."
	  },
	  {
		name: "Development Codebase",
		description: "The collection of source code files and resources used to implement the project's functionality."
	  },
	  {
		name: "Test Plan",
		description: "A plan outlining the testing approach, methodologies, and test cases to ensure project quality."
	  },
	  {
		name: "User Interface (UI)",
		description: "The graphical interface through which users interact with the project, including screens, forms, and navigation."
	  },
	  {
		name: "Database Schema",
		description: "The structure and organization of the project's database, including tables, relationships, and constraints."
	  },
	  {
		name: "Documentation",
		description: "Comprehensive documentation covering project requirements, design, implementation, testing, and usage instructions."
	  },
	  {
		name: "Deployment Plan",
		description: "A plan outlining the process and procedures for deploying the project to production or live environment."
	  }
];


module.exports = {
	up (queryInterface, Sequelize) {
		return queryInterface.bulkInsert('component', kComponents);
	},

	down (queryInterface, Sequelize) {
	}
};


require('../../string');

const { loadFromFile, buildSchemaData } = require('../wsdl');

async function test() {

	const path = process.argv[2];
	const wsdl = await loadFromFile(path);

	const schema =     kSchema;

	//console.log(data);
	for (const i of schema.fields) {
		if (!i.display)
			i.display = i.name.split('_').map(i => i.capitalizeFirstLetter()).join(' ');

		if (i.alias && !Array.isArray(i.alias))
			i.alias = [ i.alias ];
	}

	const data = buildSchemaData(wsdl, schema);

	// console.log(data);
}

test();

const kSchema = {

	fields: [

		{
			name: 'firstname',
			type: 'string',
			alias: 'forename'
		},
		{
			name: 'lastname',
			type: 'string',
			alias: 'surname'
		},
		{
			name: 'title',
			type: 'TitleType'
		},
		{
			name: 'sex',
			type: 'SexType',
			alias: 'gender'
		},
		{
			display: 'Date of birth',
			name: 'dob',
			type:'date',
			hash: true
		},
		
		{

			name: 'email',
			type: 'string'
		},
		
		{
			name: 'marital_status',
			display: 'Marital Status',
			type: 'MaritalStatusType'
		},
		{
			name: 'postcode',
			type: 'string'
		},
		{
			display: 'Driving licence',
			name: 'licence',
			type: 'string'
		},
		{
			display: 'Policy Type',
			name: 'policy_type',
			type: 'PolicyType'
		},
		{
			name: 'fuel',
			type: 'FuelType',
			// type: 'enum(Fuel)',
		},
		{
			name: 'doors',
			type: 'int',
			hash: 'true'
		},
		{
			name: 'seats',
			type: 'int'
		},
		
		{
			name: 'transmission',
			type: 'TransmissionType'
		},

		{
			name: 'claims',
			type: 'Claims'
		},

		{
			name: 'claim_code',
			display: 'Claim Code',
			type: 'string'
		},

		{
			name: 'incident_date',
			display: 'Incident Date',
			type: 'date'
		},

		{
			name: 'settled',
			type: 'boolean'
		},

		{
			name: 'convictions',
			type: 'Convictions'
		},

		{
			name: 'conviction_code',
			display: 'Conviction Code',
			type: 'string'
		},

		{
			name: 'offence_date',
			display: 'Offence Date',
			type: 'date'
		},

		
		{
			name: 'conviction_date',
			display: 'Conviction Date',
			type: 'date'
		},

		{
			name: 'registration',
			display: 'Registration Number',
			type: 'string'
		},

		{
			name: 'registration_date',
			display: 'Registration Date',
			type: 'date'
		},

		{
			name: 'value',
			type: 'int'
		},

		{
			name: 'modified',
			type: 'boolean'
		},

		{
			name: 'imported',
			type: 'boolean'
		},

		// {
		// 	name: 'drivers',
		// 	type: 'repeat(Driver)'
		// },
	],

	types: {

		Claim: [ 'claim_code', 'incident_date', 'settled' ],
		Claims: 'Claim[5]',

		Conviction: [ 'conviction_code', 'offence_date', 'conviction_date' ],
		Convictions: 'Conviction[5]',

		Driver: [

		]
	},

	enums: {
		FuelType: [
			{
				name: 'petrol',
				value: 'P'
			},
			{
				name: 'diesel',
				value: 'D'
			}
		],

		SexType: [
			{ name: 'male', value: 'Y' },
			{ name: 'female', value: 'X' },
		],
		MaritalStatusType: [
			{ name: 'divorced', value: 'D' },
			{ name: 'married', value: 'M' },
			{ name: 'partnered', value: 'P' },
			{ name: 'single', value: 'A' }
		],

		TitleType: [
			{ name: 'miss', value: 'L'},
			{ name: 'mr', value: 'M' },
			{ name: 'mrs', value: 'X' },
			{ name: 'ms', value: 'Y' },
			{ name: 'mx', value: 'Z' },
		],
		TransmissionType: [
			{ name: 'manual', value: '1' },
			{ name: 'automatic', value: 'A' }
		],
		
		PolicyType: [
			{ name: 'private', value: '2' },
			{ name: 'public', value: '1' },
			{ name: 'chauffeur', value: '3' },
		],


	},



	sections: [
		{
			name: 'Personal Information',
			fields: ['title', 'firstname', 'lastname', 'email', 'dob', 'sex', 'marital_status']
		},
		{
			name: 'Location',
			fields: ['postcode']
		},
		{
			name: 'Policy Details',
			fields: ['licence', 'policy_type', 'registration', 'registration_date' ]
		},
		{
			name: 'Claims and Convictions',
			fields: ['claims', 'convictions']
		},
		{
			name: 'Car Details',
			fields: ['fuel', 'doors', 'seats', 'transmission', 'modified', 'imported', 'value']
		}
	],

	repeaters: {



		// Driver: [
		// 	'firstname', 'lastname', 'title', 'email'
		// ]
	}

	// 'Driving licence restrictions',
	// 'Engine size',
	// 'Fuel', 
	// 'Gender', 
	// 'Make',
	// 'Model',
	// 'Parking',
	// 'Seats',
	// 'Title', 
	// 'Transmission'];
};
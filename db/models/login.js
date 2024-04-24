'use strict';

const kTable = 'login';
const kSearchTable = `${kTable}_fts`;

const {
	Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
	class Login extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here

			Login.search = (query, attr, offset=0, limit=20) => {

				console.log('Login search:', query);

				const Model = this;
				const q = `select ${attr ? attr.join(',') : '*'} from ${kTable} where rowid in (select rowid from ${kSearchTable} where ${kSearchTable} = '${query}' order by rank limit ${limit} offset ${offset})`;

				// console.log(q);
				return sequelize.query(q, Model);
			}
		}
	}
	Login.init({
		id: { type: DataTypes.STRING(32), primaryKey: true },
		name: DataTypes.STRING,
		email: { type: DataTypes.STRING, unique: true },
		password: DataTypes.STRING(64),
		login: DataTypes.INTEGER,
		state: DataTypes.ENUM('initial', 'complete', 'gmail'),
		data: DataTypes.JSONB,
		perm: DataTypes.JSONB,
		token: DataTypes.STRING
	}, {
		sequelize,
		modelName: 'Login',
		tableName: kTable,
		timestamps: true,
		updatedAt: 'updated',
		createdAt: 'created',

		// hooks: {
		// 	beforeCreate: async (Login) => {
		// 		if (Login.password) {
		// 			// const salt = await bcrypt.genSaltSync(10, 'a');
		// 			// Login.password = bcrypt.hashSync(Login.password, salt);

		// 			Login.password = Login.password.hashMD5();
		// 		}
		// 	},

		// 	beforeUpdate:async (Login) => {
		// 		if (Login.changed('password')) {
		// 		 	//const salt = await bcrypt.genSaltSync(10, 'a');
		// 		 	//Login.password = bcrypt.hashSync(Login.password, salt);
		// 			Login.password = Login.password.hashMD5();
		// 		}
		// 	}
		// },

		// instanceMethods: {
		// 	validPassword: (password) => {
		// 		return bcrypt.compareSync(password, this.password);
		// 	}
		// }
	});
	return Login;
};

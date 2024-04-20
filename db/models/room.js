'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Room.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING,
    domain: DataTypes.STRING,
    flag: DataTypes.INTEGER,
    info: DataTypes.JSONB,
  }, {
    indexes: [
      {
        name: "uid",
        unique: true,
        fields: ["name", "domain"]
      }
    ],
    sequelize,
    modelName: 'Room',
    tableName: 'room',
    timestamps: false
  });
  return Room;
};

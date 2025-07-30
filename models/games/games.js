const mongoose = require('mongoose');
const { Schema } = mongoose;

let gameSchema = new Schema({
    userID: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    exerciseType: {
        type: String,
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    calories: {
        type: Number,
        required: true,
    },
    ranks: {
        type: Number,
        required: true,
    },
    groupId: { //区分是否一组游戏的标志，我的想法是日期+
        type: String,
        required: true,
    },
    evaluation: {
        type: String,
        required: true,
    },
    recordTime: {
        type: Date,
        required: true,
    }
});

let GamesModel = mongoose.model('games', gameSchema);

module.exports = GamesModel;

// 示例数据插入
GamesModel.create({
    userID: "6781e48605df2530945d07b8",
    exerciseType: "JumpRope",
    score: 100,
    calories: 16,
    ranks: 1,
    groupId: "2024121711111111",
    evaluation: "Keep up the good work",
    recordTime: new Date("2024-12-17")
}, {
    userID: "6781e48605df2530945d07b9",
    exerciseType: "Running",
    score: 5000,
    calories: 300,
    ranks: 2,
    groupId: "2024121711111111",
    evaluation: "Great effort",
    recordTime: new Date("2024-12-18")
}, {
    userID: "6781e48605df2530945d07ba",
    exerciseType: "Cycling",
    score: 2000,
    calories: 150,
    ranks: 3,
    groupId: "2024121711111111",
    evaluation: "Well done",
    recordTime: new Date("2024-12-19")
});
// utils/faceUtils.js

//相似度阈值
const SIMILARITY_THRESHOLD = 0.35;


function compareFaceFeatures(inputFeature, storedFeature) {
    if (inputFeature.length !== storedFeature.length) {
        throw new Error("输入特征和存储特征长度不匹配");
    }

    let dotProduct = 0;
    let inputMagnitude = 0;
    let storedMagnitude = 0;

    for (let i = 0; i < inputFeature.length; i++) {
        dotProduct += inputFeature[i] * storedFeature[i];
        inputMagnitude += inputFeature[i] ** 2;
        storedMagnitude += storedFeature[i] ** 2;
    }

    inputMagnitude = Math.sqrt(inputMagnitude);
    storedMagnitude = Math.sqrt(storedMagnitude);

    if (inputMagnitude === 0 || storedMagnitude === 0) {
        throw new Error("特征向量模长为零");
    }

    const similarity = dotProduct / (inputMagnitude * storedMagnitude);
    console.log(`相似度得分: ${similarity}`);

    return similarity;
}


module.exports = {
    compareFaceFeatures,
    SIMILARITY_THRESHOLD
};
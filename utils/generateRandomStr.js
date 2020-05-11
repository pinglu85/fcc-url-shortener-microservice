const asciiStartNumbers = [48, 65, 97];

const generateRandomStr = (length) => {
  let randomStr = '';
  for (let i = 0; i < length; i++) {
    const asciiStartIndex = Math.floor(Math.random() * 3);
    const asciiStartNumber = asciiStartNumbers[asciiStartIndex];
    const asciiCode =
      asciiStartNumber === 48
        ? Math.floor(Math.random() * 10) + asciiStartNumber
        : Math.floor(Math.random() * 26) + asciiStartNumber;
    randomStr += String.fromCharCode(asciiCode);
  }
  return randomStr;
};

module.exports = generateRandomStr;

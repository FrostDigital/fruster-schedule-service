module.exports = {
	wait: (timeout = 100) => {
		return new Promise((resolve) => {
			setTimeout(resolve, timeout);
		});
	},
};

module.exports = {
    apps: [{
        name: "cashback-api",
        script: "./src/index.js",
        instances: 1,
        exec_mode: "fork",
        env: {
            NODE_ENV: "production",
            PORT: 5000 // Ensure this matches your .env PORT
        }
    }]
};

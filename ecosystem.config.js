module.exports = {
    apps: [{
        name: "cashback-api",
        script: "./src/index.js",
        instances: "max",
        exec_mode: "cluster",
        max_memory_restart: "500M",
        env: {
            NODE_ENV: "production",
            PORT: 5000 // Ensure this matches your .env PORT
        }
    }]
};

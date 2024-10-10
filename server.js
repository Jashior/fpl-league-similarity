const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the Angular app build directory
app.use(
  express.static(path.join(__dirname, "dist/fpl-league-similarity/browser"))
);

// Send all other requests to the Angular app
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "dist/fpl-league-similarity/browser/index.html")
  );
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

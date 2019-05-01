######################################################
# Builds and runs the project
######################################################
FROM node:alpine

# Specify the "working directory" for the rest of the Dockerfile
WORKDIR /usr/src/app

# Install npm packages
COPY package*.json ./

# Bundle app source
COPY . .

# Install dependencies
RUN npm install --silent

# Build the app
RUN npm run build:prod --silent

# Run the application
CMD ["npm", "run", "start"]


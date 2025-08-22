FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --include=optional
COPY . .

FROM node:18-alpine AS main
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["node", "app.js"]

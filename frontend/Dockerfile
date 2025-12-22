FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html
COPY index.html styles.css app.js ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

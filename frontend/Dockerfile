FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
# keep default nginx config (serves index.html)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

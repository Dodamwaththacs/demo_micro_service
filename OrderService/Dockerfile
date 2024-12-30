FROM openjdk:17-jdk-slim
WORKDIR /src
COPY target/OrderService-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java","-jar","app.jar"]

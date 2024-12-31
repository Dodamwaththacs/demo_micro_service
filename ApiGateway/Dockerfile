#Build the jar file using the command: mvn clean install
FROM maven:3.8-openjdk-17 AS builder
WORKDIR /build
COPY pom.xml .
COPY src src
RUN mvn -B clean package

#Create a new image with the jar file
FROM openjdk:17-jdk-slim
WORKDIR /src
COPY --from=builder /build/target/ApiGateway-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8761
ENTRYPOINT ["java","-jar","app.jar"]

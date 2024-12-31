FROM maven:3.8-openjdk-17 AS builder
WORKDIR /build
COPY pom.xml .
COPY src src
RUN mvn -B clean package


FROM openjdk:17-jdk-slim
WORKDIR /src
COPY --from=builder /build/target/EurekaServer-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8761
ENTRYPOINT ["java","-jar","app.jar"]

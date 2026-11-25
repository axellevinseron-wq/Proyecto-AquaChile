FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/aquachile-backend-0.0.1-SNAPSHOT.jar app.jar

ENV SERVER_PORT=10000

EXPOSE 10000

ENTRYPOINT ["java", "-Xms64m", "-Xmx256m", "-jar", "app.jar"]

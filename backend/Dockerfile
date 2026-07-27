# --- STAGE 1: Build
FROM golang:1.26-alpine AS builder
WORKDIR /app

# Dependency installation
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Compile
RUN CGO_ENABLED=0 GOOS=linux go build -o autora-backend ./main.go


# --- STAGE 2: Final Image for production
FROM alpine:latest AS production
WORKDIR /app/

# Create unprivileged user for security reasons
RUN addgroup -S autoragroup && adduser -S autora -G autoragroup

# Copy final binary from first stage
COPY --chown=autora:autoragroup --from=builder /app/autora-backend .

USER autora

# Expose the port
EXPOSE 8080

CMD [ "./autora-backend" ]

# --- STAGE 3: Running the project with air for hot-reload
# this enables easier development without needing to restart & rebuild on changes
# check https://github.com/air-verse/air#docker for details
FROM golang:1.26-alpine AS development

WORKDIR /app

RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download

CMD ["air", "-c", ".air.toml"]

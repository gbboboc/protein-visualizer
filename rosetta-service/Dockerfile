FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
	ca-certificates \
	curl \
	wget \
	build-essential \
	libssl-dev \
	libffi-dev \
	python3-dev \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install PyRosetta using official academic installer
RUN pip install pyrosetta-installer && \
	python -c "import pyrosetta_installer; pyrosetta_installer.install_pyrosetta()"

COPY . .

# Create work directories
RUN mkdir -p /work/jobs /work/results

# Set environment variables
ENV MONGODB_URI=""

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


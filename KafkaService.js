const { Kafka } = require("kafkajs");
class KafkaService {
  constructor(brokers) {
    console.log("Initializing KafkaService with brokers:", brokers);
    const kafka = new Kafka({
      clientId: "roomBookingService",
      brokers: brokers,
    });

    this.producer = kafka.producer();
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log("Connecting to Kafka...");
      await this.producer.connect();
      this.isConnected = true;
      console.log("Kafka Producer connected successfully.");
    } catch (error) {
      console.error("Connection to Kafka failed:", error);
      this.isConnected = false;
      throw error;
    }
  }

  async sendNotification(topic, notification) {
    if (!this.isConnected) {
      console.log("Producer is not connected, attempting to reconnect...");
      await this.connect();
    }
    try {
      console.log(`Sending notification to topic '${topic}'...`);
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(notification) }],
      });
      console.log(`Notification sent: ${JSON.stringify(notification)}`);
    } catch (error) {
      console.error("Failed to send notification, error:", error);
      this.isConnected = false; // Assume the connection is bad on error
      throw error;
    }
  }

  async disconnect() {
    console.log("Disconnecting Kafka Producer...");
    await this.producer.disconnect();
    this.isConnected = false;
    console.log("Kafka Producer disconnected successfully.");
  }
}

module.exports = KafkaService;

class Notification {
  constructor(notificationType) {
    const eventTime = new Date();
    this.notificationType = notificationType;
    this.eventTime = this.formatDate(eventTime);
    this.owner = "";
    this.message = "";
    this.sourceID = "";
  }

  formatDate(date) {
    return `${
      date.getMonth() + 1
    }-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
  }

  clone(other) {
    this.notificationType = other.notificationType;
    this.eventTime = other.eventTime;
    this.owner = other.owner;
    this.message = other.message;
    this.sourceID = other.sourceID;
  }

  setNotificationType(notificationType) {
    this.notificationType = notificationType;
  }

  getNotificationType() {
    return this.notificationType;
  }

  setEventTime(eventTime) {
    this.eventTime = eventTime;
  }

  getEventTime() {
    return this.eventTime;
  }

  setOwner(owner) {
    this.owner = owner;
  }

  getOwner() {
    return this.owner;
  }

  setMessage(message) {
    this.message = message;
  }

  getMessage() {
    return this.message;
  }

  setSourceID(sourceID) {
    this.sourceID = sourceID;
  }

  getSourceID() {
    return this.sourceID;
  }
}

module.exports = Notification;

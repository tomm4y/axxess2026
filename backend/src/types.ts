export class UserId {
  private constructor(private readonly value: string) {}

  /**
   * Creates a UserId from a string.
   * @internal Should only be used for debugging/testing. Use getUserByUuid or getUserByEmail to obtain a validated UserId.
   */
  static create(value: string): UserId {
    return new UserId(value);
  }

  toString(): string {
    return this.value;
  }
}

export class RoomId {
  private constructor(private readonly value: string) {}

  /**
   * Creates a RoomId from a string.
   * @internal Should only be used for debugging/testing. Use getOrCreateRoom to obtain a validated RoomId.
   */
  static create(value: string): RoomId {
    return new RoomId(value);
  }

  toString(): string {
    return this.value;
  }
}

export class SessionId {
  private constructor(private readonly value: string) {}

  /**
   * Creates a SessionId from a string.
   * @internal Should only be used for debugging/testing. Use newSession to obtain a validated SessionId.
   */
  static create(value: string): SessionId {
    return new SessionId(value);
  }

  toString(): string {
    return this.value;
  }
}

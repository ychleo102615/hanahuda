export interface CreatePrivateRoomResponse {
  readonly success: boolean
  readonly room_id: string
  readonly share_url: string
  readonly expires_at: string
  readonly error?: { code: string; message: string }
}

export interface JoinPrivateRoomResponse {
  readonly success: boolean
  readonly room_id: string
  readonly host_name: string
  readonly room_type: string
  readonly error?: { code: string; message: string }
}

export interface CreatePrivateRoomOptions {
  readonly roomType: string
}


export class PrivateRoomApiClient {
  async create(options: CreatePrivateRoomOptions): Promise<CreatePrivateRoomResponse> {
    return $fetch<CreatePrivateRoomResponse>('/api/v1/private-room/create', {
      method: 'POST',
      body: { room_type: options.roomType },
    })
  }

  async join(roomId: string): Promise<JoinPrivateRoomResponse> {
    return $fetch<JoinPrivateRoomResponse>(`/api/v1/private-room/${roomId}/join`, {
      method: 'POST',
    })
  }

  async dissolve(roomId: string): Promise<void> {
    await $fetch(`/api/v1/private-room/${roomId}/dissolve`, {
      method: 'POST',
    })
  }

  async getStatus(roomId: string): Promise<unknown> {
    return $fetch(`/api/v1/private-room/${roomId}/status`)
  }
}

export function createPrivateRoomApiClient(): PrivateRoomApiClient {
  return new PrivateRoomApiClient()
}

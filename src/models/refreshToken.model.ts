import mongoose, { Document, Schema, Types } from 'mongoose';

// We do NOT store the raw refresh token string in the database. The token
// itself is a signed JWT, so its signature already proves it's genuine; all
// we need to track server-side is enough metadata to revoke/rotate it:
// - jti: a unique id embedded in the token, used to look this record up
// - which user it belongs to
// - when it expires
// - whether it has been revoked (used up by rotation, or manually revoked)
export interface IRefreshToken extends Document {
  jti: string;
  user: Types.ObjectId;
  expiresAt: Date;
  revoked: boolean;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  jti: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
});

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);

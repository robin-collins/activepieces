import { ActionBase, TriggerBase } from '@activepieces/pieces-framework';
import {
  ActionType,
  PackageType,
  PieceCategory,
  PieceType,
  TriggerType,
} from '@activepieces/shared';

export class FlowItemDetails {
  constructor(
    public type: ActionType | TriggerType,
    public name: string,
    public description: string,
    public logoUrl?: string,
    public categories?: PieceCategory[],
    public extra?: {
      packageType: PackageType;
      pieceType: PieceType;
      pieceName: string;
      pieceVersion: string;
    },
    public suggestions?: ActionBase[] | TriggerBase[]
  ) {}
}

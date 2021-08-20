using System;

class Motor {
    public class Phase {
        public double MagPow;
        public double Bemf;
    }

    public class Slot {
        public int Phase;
        public double PosX;
        public double PosY;
        public double MagPow;
        public double Bemf;
    }

    public class Magnet {
        public double PosAx;
        public double PosAy;
        public double PosBx;
        public double PosBy;
        public double RotPosAx;
        public double RotPosAy;
        public double RotPosBx;
        public double RotPosBy;
        public int Pole;
    }

    public Phase[] PhaseList;
    public Slot[] SlotList;
    public Magnet[] MagnetList;
    public double BemfAmp = 0;
    public double Theta;

    const double DeltaT = 1 / 60.0;
    double mMagPowScale;
    int mPhaseDiv;

    public void InitStator(int poles, int phase, int slotDiv, double gap) {
        var slots = poles * phase;
        mPhaseDiv = poles * slotDiv;
        SlotList = new Slot[slots * slotDiv];
        for (int s = 0; s < slots; s++) {
            var slotBegin = (double)s / slots;
            for (int div = 0; div < slotDiv; div++) {
                var thD = (div + 0.5) / slotDiv - 0.5;
                var th = 2 * Math.PI * (slotBegin + (1.0 - gap) / slots * thD);
                var slot = new Slot();
                slot.Phase = s % phase;
                slot.PosX = Math.Cos(th) * 0.5;
                slot.PosY = Math.Sin(th) * 0.5;
                SlotList[slotDiv * s + div] = slot;
            }
        }

        PhaseList = new Phase[phase];
        for (int p = 0; p < phase; p++) {
            PhaseList[p] = new Phase();
        }
    }

    public void InitRotor(int poles, int magnetDiv, double gap) {
        Theta = 0.0;
        mMagPowScale = 1.0 / Math.Sqrt(magnetDiv);
        MagnetList = new Magnet[poles * magnetDiv];
        var poleDelta = (1.0 - gap) / poles / magnetDiv;
        for (int p = 0; p < poles; p++) {
            var poleBegin = (double)p / poles;
            for (int div = 0; div < magnetDiv; div++) {
                var magnet = new Magnet();

                var th = 2 * Math.PI * (poleBegin + poleDelta * div);
                magnet.Pole = 0 == p % 2 ? 1 : -1;
                magnet.PosAx = Math.Cos(th) * 0.5;
                magnet.PosAy = Math.Sin(th) * 0.5;
                magnet.RotPosAx = magnet.PosAx;
                magnet.RotPosAy = magnet.PosAy;

                th = 2 * Math.PI * (poleBegin + poleDelta * (div + 1));
                magnet.PosBx = Math.Cos(th) * 0.5;
                magnet.PosBy = Math.Sin(th) * 0.5;
                magnet.RotPosBx = magnet.PosBx;
                magnet.RotPosBy = magnet.PosBy;

                MagnetList[magnetDiv * p + div] = magnet;
            }
        }
    }

    public void Update() {
        for (int p = 0; p < PhaseList.Length; p++) {
            var phase = PhaseList[p];
            phase.MagPow = 0.0;
            phase.Bemf = 0.0;
        }

        var c = Math.Cos(Theta);
        var s = Math.Sin(Theta);
        for (int i = 0; i < SlotList.Length; i++) {
            var slot = SlotList[i];
            var magPow = 0.0;
            for (int j = 0; j < MagnetList.Length; j++) {
                var magnet = MagnetList[j];
                var rotAx = magnet.PosAx * c - magnet.PosAy * s;
                var rotAy = magnet.PosAx * s + magnet.PosAy * c;
                var rotBx = magnet.PosBx * c - magnet.PosBy * s;
                var rotBy = magnet.PosBx * s + magnet.PosBy * c;
                var abX = rotBx - rotAx;
                var abY = rotBy - rotAy;
                var asX = slot.PosX - rotAx;
                var asY = slot.PosY - rotAy;
                var k = (abX * asX + abY * asY) / (abX * abX + abY * abY);
                if (k < 0) {
                    asX = slot.PosX - rotAx;
                    asY = slot.PosY - rotAy;
                } else if (1 < k) {
                    asX = slot.PosX - rotBx;
                    asY = slot.PosY - rotBy;
                } else {
                    asX = slot.PosX - (rotAx + abX * k);
                    asY = slot.PosY - (rotAy + abY * k);
                }
                magPow += magnet.Pole / (asX * asX + asY * asY + 0.2);

                magnet.RotPosAx = rotAx;
                magnet.RotPosAy = rotAy;
                magnet.RotPosBx = rotBx;
                magnet.RotPosBy = rotBy;
            }
            magPow *= mMagPowScale;
            slot.Bemf = -BemfAmp * (magPow - slot.MagPow);
            slot.MagPow = magPow;
            var phase = PhaseList[slot.Phase];
            phase.Bemf += slot.Bemf;
            phase.MagPow += slot.MagPow;
        }

        for (int p = 0; p < PhaseList.Length; p++) {
            var phase = PhaseList[p];
            phase.MagPow /= mPhaseDiv;
            phase.Bemf /= mPhaseDiv;
        }
    }
}

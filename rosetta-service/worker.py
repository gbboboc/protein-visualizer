from pathlib import Path
import json
import os

WORK_DIR = Path("/work")
IN_DIR = WORK_DIR / "jobs"
OUT_DIR = WORK_DIR / "results"

# Initialize PyRosetta once at module load
_PYROSETTA_INITIALIZED = False
_PYROSETTA_AVAILABLE = False

def _check_pyrosetta():
    """Check if PyRosetta is available."""
    try:
        import pyrosetta
        return True
    except ImportError:
        return False

_PYROSETTA_AVAILABLE = _check_pyrosetta()

def _init_pyrosetta():
    """Initialize PyRosetta with minimal output."""
    global _PYROSETTA_INITIALIZED
    if not _PYROSETTA_INITIALIZED and _PYROSETTA_AVAILABLE:
        try:
            from pyrosetta import init
            init("-mute all -ignore_unrecognized_res")
            _PYROSETTA_INITIALIZED = True
            print("PyRosetta initialized successfully")
        except Exception as e:
            print(f"PyRosetta initialization failed: {e}")
            raise


def _write_status(job_id: str, status: str, error: str | None = None):
    out = OUT_DIR / job_id
    out.mkdir(parents=True, exist_ok=True)
    with (out / "status.json").open("w", encoding="utf-8") as f:
        json.dump({"jobId": job_id, "status": status, "errorMessage": error}, f)


def _apply_directional_constraints(pose, directions: list[str]):
    """Apply constraints to bias folding toward specific directions (for HP model)."""
    if not directions:
        return
    
    try:
        from pyrosetta.rosetta.core.scoring.constraints import (
            AtomPairConstraint,
            HarmonicFunc,
        )
        from pyrosetta.rosetta.core.id import AtomID
        from pyrosetta.rosetta.core.scoring import ScoreType
        
        # Direction vectors for HP lattice model
        direction_map = {
            'R': (1, 0, 0),   # Right
            'L': (-1, 0, 0),  # Left
            'U': (0, 1, 0),   # Up
            'D': (0, -1, 0),  # Down
            'F': (0, 0, 1),   # Forward
            'B': (0, 0, -1),  # Back
        }
        
        # Apply distance constraints between consecutive residues
        # to encourage the specified directions
        constraint_weight = 5.0  # Weight for directional bias
        target_distance = 3.8    # ~CA-CA distance in Angstroms
        
        for i, direction in enumerate(directions):
            res_idx = i + 1  # Current residue (1-indexed)
            next_res_idx = res_idx + 1
            
            if next_res_idx > pose.total_residue():
                continue
                
            direction = direction.upper()
            if direction not in direction_map:
                print(f"Warning: Unknown direction '{direction}' at position {i}")
                continue
            
            # Get CA atoms for both residues
            try:
                atom1 = AtomID(2, res_idx)      # CA of current residue (atom 2 is usually CA)
                atom2 = AtomID(2, next_res_idx) # CA of next residue
                
                # Create harmonic constraint favoring the target distance
                # The function creates a harmonic potential with minimum at target_distance
                harmonic = HarmonicFunc(target_distance, 1.0)
                constraint = AtomPairConstraint(atom1, atom2, harmonic)
                
                # Add constraint to pose
                pose.add_constraint(constraint)
                
            except Exception as e:
                print(f"Warning: Could not add constraint for residue {res_idx}: {e}")
                continue
        
        # Add constraint score term to the pose's energy function
        if pose.constraint_set().has_constraints():
            print(f"Applied {len(directions)} directional constraints")
        
    except Exception as e:
        print(f"Warning: Could not apply directional constraints: {e}")


def _write_stub_pdb(job_id: str, sequence: str = "GLY"):
    """Write a minimal valid PDB as fallback when PyRosetta is not available."""
    pdb = """
ATOM      1  N   GLY A   1       0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  GLY A   1       1.458   0.000   0.000  1.00  0.00           C
ATOM      3  C   GLY A   1       1.958   1.410   0.000  1.00  0.00           C
ATOM      4  O   GLY A   1       1.158   2.330   0.000  1.00  0.00           O
TER
END
""".strip()
    out = OUT_DIR / job_id
    out.mkdir(parents=True, exist_ok=True)
    (out / "output.pdb").write_text(pdb + "\n", encoding="utf-8")


def run_job(job_id: str):
    _write_status(job_id, "running")
    energy_value = None
    
    try:
        # Load job data
        job_in = IN_DIR / job_id / "input.json"
        data = json.loads(job_in.read_text(encoding="utf-8"))
        
        sequence = data["sequence"]
        params = data.get("params", {})
        protocol = params.get("protocol", "relax")
        repeats = params.get("repeats", 1)
        seed = params.get("seed")
        directions = data.get("directions", [])
        bias_to_directions = params.get("biasToDirections", True)
        
        print(f"Processing job {job_id}: {sequence} (protocol: {protocol})")
        
        if _PYROSETTA_AVAILABLE:
            print("Using PyRosetta for folding...")
            # Initialize PyRosetta
            _init_pyrosetta()
            
            # Set random seed if provided for reproducibility
            if seed:
                try:
                    from pyrosetta.rosetta.numeric.random import rg
                    seed_value = int(seed) if seed.isdigit() else hash(seed) % (2**31)
                    rg().set_seed(seed_value)
                    print(f"Set random seed to: {seed_value}")
                except Exception as e:
                    print(f"Warning: Could not set seed '{seed}': {e}")
            
            # Import PyRosetta modules
            from pyrosetta import pose_from_sequence, get_fa_scorefxn
            from pyrosetta.rosetta.protocols.relax import FastRelax
            from pyrosetta.rosetta.protocols.simple_moves import SmallMover, ShearMover
            from pyrosetta.rosetta.protocols.moves import MonteCarlo, RepeatMover, SequenceMover
            
            # Create pose from sequence
            pose = pose_from_sequence(sequence, "fa_standard")
            
            # Get scoring function
            scorefxn = get_fa_scorefxn()
            
            # Apply directional constraints if requested
            if bias_to_directions and directions:
                _apply_directional_constraints(pose, directions)
                # Enable constraint scoring if constraints were added
                if pose.constraint_set().has_constraints():
                    from pyrosetta.rosetta.core.scoring import ScoreType
                    scorefxn.set_weight(ScoreType.atom_pair_constraint, 1.0)
                    print("Enabled constraint scoring in energy function")
            
            # Apply the selected protocol
            if protocol == "relax":
                # Fast relax protocol
                relax = FastRelax()
                relax.set_scorefxn(scorefxn)
                for _ in range(repeats):
                    relax.apply(pose)
                    
            elif protocol == "fold":
                # Simple folding protocol using Monte Carlo
                small_mover = SmallMover()
                small_mover.nmoves(1)
                shear_mover = ShearMover()
                shear_mover.nmoves(1)
                
                # Create sequence of moves
                seq_mover = SequenceMover()
                seq_mover.add_mover(small_mover)
                seq_mover.add_mover(shear_mover)
                
                # Monte Carlo with temperature
                mc = MonteCarlo(pose, scorefxn, 2.0)
                
                # Repeat folding moves
                trial_mover = RepeatMover(seq_mover, repeats * 100)
                trial_mover.apply(pose)
                
                mc.recover_low(pose)
                
            else:
                # Default: just score the pose
                pass
            
            # Calculate final energy
            energy_value = scorefxn(pose)
            print(f"Final energy for job {job_id}: {energy_value}")
            
            # Save PDB
            output_pdb = OUT_DIR / job_id / "output.pdb"
            output_pdb.parent.mkdir(parents=True, exist_ok=True)
            pose.dump_pdb(str(output_pdb))
        else:
            print("PyRosetta not available - using stub PDB (install PyRosetta for real folding)")
            import time
            time.sleep(2)  # Simulate processing
            _write_stub_pdb(job_id, sequence)
            energy_value = -10.5  # Placeholder
        
        _write_status(job_id, "succeeded")
        
        # Save results to database if MongoDB is available
        try:
            _save_to_database(job_id, data, energy_value)
        except Exception as db_error:
            print(f"Warning: Failed to save to database: {db_error}")
            
    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        import traceback
        traceback.print_exc()
        _write_status(job_id, "failed", str(e))


def _save_to_database(job_id: str, job_data: dict, energy: float | None = None):
    """Save job results to MongoDB database"""
    try:
        import pymongo
        from datetime import datetime
        
        # Get MongoDB URI from environment
        mongodb_uri = os.getenv("MONGODB_URI")
        if not mongodb_uri:
            print("Warning: MONGODB_URI not set, skipping database save")
            return
            
        # Connect to MongoDB
        client = pymongo.MongoClient(mongodb_uri)
        db = client.protein_visualizer
        collection = db.rosettajobs
        
        # Read PDB content
        pdb_path = OUT_DIR / job_id / "output.pdb"
        pdb_content = pdb_path.read_text(encoding="utf-8") if pdb_path.exists() else ""
        
        # Update job in database with actual energy
        update_data = {
            "status": "succeeded",
            "pdbContent": pdb_content,
            "completedAt": datetime.utcnow(),
        }
        
        if energy is not None:
            update_data["energy"] = energy
        
        collection.update_one(
            {"jobId": job_id},
            {"$set": update_data}
        )
        
        client.close()
        print(f"Successfully saved job {job_id} to database (energy: {energy})")
        
    except ImportError:
        print("PyMongo not available, skipping database save")
    except Exception as e:
        print(f"Database save failed: {e}")
        raise


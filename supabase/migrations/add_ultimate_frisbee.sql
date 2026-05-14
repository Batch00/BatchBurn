ALTER TABLE batchburn.cross_training DROP CONSTRAINT IF EXISTS cross_training_activity_type_check;
ALTER TABLE batchburn.cross_training ADD CONSTRAINT cross_training_activity_type_check
  CHECK (activity_type IN ('Bike','Walk','Stair Master','Swim','Strength','Yoga',
    'Soccer','Tennis','Pickleball','Basketball','Hiking','Treadmill',
    'Elliptical','Rowing','Climbing','Ultimate Frisbee','Other'));

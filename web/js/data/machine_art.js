// Machine art, measured by tools/import_machines.py: each door's glass (centre and radius as
// fractions of the sprite's width and height), its ring colour and hinge side (-1 left, 1 right).
export const MACHINE_ART = {
 "dryer_cloud": {
  "doors": [
   {
    "cx": 0.5042,
    "cy": 0.2681,
    "hinge": 1,
    "r": 0.3005,
    "ring": "#918c82"
   },
   {
    "cx": 0.5042,
    "cy": 0.6887,
    "hinge": 1,
    "r": 0.3008,
    "ring": "#8f8a80"
   }
  ],
  "h": 500,
  "open": {
   "doors": [
    {
     "cx": 0.456,
     "cy": 0.2746,
     "r": 0.262
    },
    {
     "cx": 0.4557,
     "cy": 0.6947,
     "r": 0.2617
    }
   ],
   "dx": 0.0,
   "sprite": "dryer_cloud_open",
   "w": 1.0769
  },
  "w": 182
 },
 "dryer_gas": {
  "doors": [
   {
    "cx": 0.5032,
    "cy": 0.268,
    "hinge": 1,
    "r": 0.2981,
    "ring": "#938f84"
   },
   {
    "cx": 0.5031,
    "cy": 0.6887,
    "hinge": 1,
    "r": 0.2985,
    "ring": "#908b82"
   }
  ],
  "h": 500,
  "open": {
   "doors": [
    {
     "cx": 0.4575,
     "cy": 0.2742,
     "r": 0.2631
    },
    {
     "cx": 0.457,
     "cy": 0.6938,
     "r": 0.263
    }
   ],
   "dx": 0.0,
   "sprite": "dryer_gas_open",
   "w": 1.0598
  },
  "w": 184
 },
 "dryer_heat": {
  "doors": [
   {
    "cx": 0.5032,
    "cy": 0.2681,
    "hinge": 1,
    "r": 0.3009,
    "ring": "#959085"
   },
   {
    "cx": 0.5034,
    "cy": 0.6886,
    "hinge": 1,
    "r": 0.3015,
    "ring": "#938e83"
   }
  ],
  "h": 500,
  "open": {
   "doors": [
    {
     "cx": 0.4578,
     "cy": 0.2744,
     "r": 0.2631
    },
    {
     "cx": 0.4576,
     "cy": 0.6945,
     "r": 0.2633
    }
   ],
   "dx": 0.0,
   "sprite": "dryer_heat_open",
   "w": 1.0714
  },
  "w": 182
 },
 "dryer_inferno": {
  "doors": [
   {
    "cx": 0.5063,
    "cy": 0.2682,
    "hinge": 1,
    "r": 0.2984,
    "ring": "#8f8a80"
   },
   {
    "cx": 0.5064,
    "cy": 0.6889,
    "hinge": 1,
    "r": 0.2989,
    "ring": "#8c877c"
   }
  ],
  "h": 500,
  "open": {
   "doors": [
    {
     "cx": 0.4596,
     "cy": 0.2741,
     "r": 0.2626
    },
    {
     "cx": 0.4588,
     "cy": 0.694,
     "r": 0.2624
    }
   ],
   "dx": 0.0,
   "sprite": "dryer_inferno_open",
   "w": 1.0656
  },
  "w": 183
 },
 "dryer_stack": {
  "doors": [
   {
    "cx": 0.5062,
    "cy": 0.2687,
    "hinge": 1,
    "r": 0.2982,
    "ring": "#959084"
   },
   {
    "cx": 0.5066,
    "cy": 0.6889,
    "hinge": 1,
    "r": 0.2988,
    "ring": "#908b80"
   }
  ],
  "h": 500,
  "open": {
   "doors": [
    {
     "cx": 0.46,
     "cy": 0.2741,
     "r": 0.2669
    },
    {
     "cx": 0.4588,
     "cy": 0.6947,
     "r": 0.2659
    }
   ],
   "dx": 0.0,
   "sprite": "dryer_stack_open",
   "w": 1.0489
  },
  "w": 184
 },
 "washer_classic": {
  "doors": [
   {
    "cx": 0.4914,
    "cy": 0.5216,
    "hinge": -1,
    "r": 0.2647,
    "ring": "#a3a098"
   }
  ],
  "h": 330,
  "open": {
   "doors": [
    {
     "cx": 0.5051,
     "cy": 0.5239,
     "r": 0.2579
    }
   ],
   "dx": 0.0,
   "sprite": "washer_classic_open",
   "w": 1.0
  },
  "w": 200
 },
 "washer_eco": {
  "doors": [
   {
    "cx": 0.4922,
    "cy": 0.5227,
    "hinge": -1,
    "r": 0.2632,
    "ring": "#e3d4ba"
   }
  ],
  "h": 330,
  "open": {
   "doors": [
    {
     "cx": 0.5043,
     "cy": 0.5238,
     "r": 0.2574
    }
   ],
   "dx": 0.005,
   "sprite": "washer_eco_open",
   "w": 0.995
  },
  "w": 201
 },
 "washer_pro": {
  "doors": [
   {
    "cx": 0.488,
    "cy": 0.5272,
    "hinge": -1,
    "r": 0.2643,
    "ring": "#a59d94"
   }
  ],
  "h": 330,
  "open": {
   "doors": [
    {
     "cx": 0.5047,
     "cy": 0.5241,
     "r": 0.2581
    }
   ],
   "dx": 0.005,
   "sprite": "washer_pro_open",
   "w": 0.995
  },
  "w": 201
 },
 "washer_speed": {
  "doors": [
   {
    "cx": 0.492,
    "cy": 0.5224,
    "hinge": -1,
    "r": 0.2654,
    "ring": "#aeaba5"
   }
  ],
  "h": 330,
  "open": {
   "doors": [
    {
     "cx": 0.5067,
     "cy": 0.5241,
     "r": 0.2581
    }
   ],
   "dx": 0.0,
   "sprite": "washer_speed_open",
   "w": 1.0
  },
  "w": 200
 },
 "washer_titan": {
  "doors": [
   {
    "cx": 0.479,
    "cy": 0.5235,
    "hinge": -1,
    "r": 0.2366,
    "ring": "#a19a90"
   }
  ],
  "h": 330,
  "open": {
   "doors": [
    {
     "cx": 0.5031,
     "cy": 0.5231,
     "r": 0.2559
    }
   ],
   "dx": 0.005,
   "sprite": "washer_titan_open",
   "w": 0.995
  },
  "w": 201
 },
 "washer_turbo": {
  "doors": [
   {
    "cx": 0.4938,
    "cy": 0.5227,
    "hinge": -1,
    "r": 0.2622,
    "ring": "#383632"
   }
  ],
  "h": 330,
  "open": {
   "doors": [
    {
     "cx": 0.4963,
     "cy": 0.5228,
     "r": 0.2599
    }
   ],
   "dx": 0.005,
   "sprite": "washer_turbo_open",
   "w": 0.995
  },
  "w": 201
 }
};

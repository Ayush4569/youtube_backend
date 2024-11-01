//  const asyncHandler = (fn = async (req, res, next) => {
//    try {
//      await fn();
//    } catch (error) {
//      res.status(error.status || 500).json({
//        success: false,
//        message: error.message,
//      });
//    }
//  });

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

import catchAsync from '../utils/catchAsync';

// eslint-disable-next-line import/prefer-default-export
export const sendStatus = catchAsync(async (req, res) => {
    res.status(200).json({
        server: 'ok',
        db: 'ok',
    });
});
